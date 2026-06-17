// POST /api/criar-membro
//
// Cria um MEMBRO interno de fazenda (gerente, operador ou visualizador).
// Substitui a Edge Function antiga que so aceitava role='admin' do caller.
//
// Quem pode chamar: usuario logado com role IN ('admin', 'superadmin').
// Role do novo membro: gerente | operador | visualizador (NUNCA admin -
// dono de fazenda e criado em /clientes via /api/criar-cliente).
//
// Acoes:
// 1. Valida JWT do caller, checa role
// 2. Valida payload (nome, email, senha minima, role permitido, fazenda_id obrigatorio)
// 3. Se caller e 'admin' (nao superadmin), forca fazenda_id = fazenda dele
// 4. Cria auth user via Supabase Admin API
// 5. Cria registro public.usuarios
// 6. Rollback do auth se insert falhar

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checarLimite, getIp } from "@/lib/rate-limit";
import { logErro, logInfo, logWarn } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES_PERMITIDAS = new Set(["gerente", "operador", "visualizador"]);

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const lim = checarLimite(`criar-membro:${ip}`, 20, 60);
  if (!lim.ok) {
    return NextResponse.json(
      { erro: "Muitas tentativas. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(lim.resetIn) } },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ erro: "env vars ausentes" }, { status: 503 });
  }

  // 1. JWT do caller
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ erro: "sem token" }, { status: 401 });

  const sbAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const rUser = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!rUser.ok) return NextResponse.json({ erro: "token invalido" }, { status: 401 });
  const userData = await rUser.json();
  const callerAuthId = userData?.id;
  if (!callerAuthId) return NextResponse.json({ erro: "user nao encontrado" }, { status: 401 });

  // 2. Caller precisa ser admin ou superadmin
  const rCaller = await sbAdmin
    .from("usuarios")
    .select("id, role, fazenda_id")
    .eq("auth_id", callerAuthId)
    .maybeSingle();
  const callerRole = rCaller.data?.role;
  const callerFazendaId = rCaller.data?.fazenda_id;
  if (callerRole !== "admin" && callerRole !== "superadmin") {
    logWarn("criar_membro_acesso_negado", { ip, callerAuthId, callerRole });
    return NextResponse.json(
      { erro: "Sem permissao. Apenas admin de fazenda ou superadmin podem criar membros." },
      { status: 403 },
    );
  }

  // 3. Valida payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "body invalido" }, { status: 400 });
  }
  const nome = String(body.nome || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha_inicial || "");
  const role = String(body.role || "");
  let fazendaId = body.fazenda_id ? String(body.fazenda_id) : null;
  const telefone = body.telefone ? String(body.telefone).trim() : null;
  const cargo = body.cargo ? String(body.cargo).trim() : null;

  if (!nome) return NextResponse.json({ erro: "nome obrigatorio" }, { status: 400 });
  if (!email || !email.includes("@")) {
    return NextResponse.json({ erro: "email invalido" }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ erro: "senha precisa de 8+ caracteres" }, { status: 400 });
  }
  if (!ROLES_PERMITIDAS.has(role)) {
    return NextResponse.json(
      { erro: `role invalido (use: ${Array.from(ROLES_PERMITIDAS).join(", ")})` },
      { status: 400 },
    );
  }

  // Admin de fazenda so pode criar membros da PROPRIA fazenda (forca).
  // Superadmin escolhe livremente; se nao mandar fazenda_id, recusa.
  if (callerRole === "admin") {
    if (callerFazendaId) {
      fazendaId = callerFazendaId; // forca
    } else if (!fazendaId) {
      return NextResponse.json(
        { erro: "Admin de fazenda precisa estar vinculado a uma fazenda" },
        { status: 400 },
      );
    }
  }
  if (!fazendaId) {
    return NextResponse.json({ erro: "fazenda_id obrigatorio" }, { status: 400 });
  }

  // 4. Cria auth user
  const rAuth = await sbAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (rAuth.error || !rAuth.data.user) {
    logErro("criar_membro_auth_falhou", rAuth.error || new Error("user vazio"), { ip, email });
    const msg = rAuth.error?.message || "?";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return NextResponse.json({ erro: "Este e-mail ja esta cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ erro: "falha ao criar auth: " + msg }, { status: 500 });
  }
  const novoAuthId = rAuth.data.user.id;

  // 5. Cria registro usuarios
  const rIns = await sbAdmin
    .from("usuarios")
    .insert({
      auth_id: novoAuthId,
      nome,
      email,
      role,
      fazenda_id: fazendaId,
      telefone,
      cargo,
      ativo: true,
    })
    .select("id")
    .single();
  if (rIns.error || !rIns.data) {
    logErro("criar_membro_insert_falhou", rIns.error || new Error("data vazio"), { ip, email });
    await sbAdmin.auth.admin.deleteUser(novoAuthId).catch(() => {});
    return NextResponse.json(
      { erro: "falha ao criar usuario: " + (rIns.error?.message || "?") },
      { status: 500 },
    );
  }

  logInfo("criar_membro_ok", {
    ip,
    autor_role: callerRole,
    novo_usuario_id: rIns.data.id,
    novo_email: email,
    novo_role: role,
    fazenda_id: fazendaId,
  });

  return NextResponse.json({ ok: true, usuario_id: rIns.data.id, email });
}
