// POST /api/criar-cliente
//
// Cria um NOVO CLIENTE da plataforma (dono de fazenda).
// Diferente de /usuarios que cria membros internos de fazenda
// (operadores, gerentes), aqui o usuario sera role='admin' SEM
// fazenda_id - o proprio cliente vai criar a fazenda dele via
// onboarding no primeiro login.
//
// Acesso: APENAS superadmin (verificado via service_role).
//
// Recebe: { nome, email, senha_inicial, plano_id, telefone? }
// Retorna: { ok, usuario_id, email }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checarLimite, getIp } from "@/lib/rate-limit";
import { logErro, logInfo, logWarn } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  // Limite duro: 5 criacoes por minuto por IP. So superadmin chama,
  // mas se o token vazar, freia o estrago.
  const lim = checarLimite(`criar-cliente:${ip}`, 5, 60);
  if (!lim.ok) {
    logWarn("criar_cliente_rate_limit", { ip, resetIn: lim.resetIn });
    return NextResponse.json(
      { erro: "Muitas tentativas. Tente novamente em alguns segundos." },
      { status: 429, headers: { "Retry-After": String(lim.resetIn) } },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ erro: "env vars ausentes" }, { status: 503 });
  }

  // 1) Identifica caller via JWT do header
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ erro: "sem token" }, { status: 401 });
  }

  const sbAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Resolve usuario chamando o endpoint /auth/v1/user com o token recebido
  const rUser = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!rUser.ok) {
    return NextResponse.json({ erro: "token invalido" }, { status: 401 });
  }
  const userData = await rUser.json();
  const authUserId = userData?.id;
  if (!authUserId) {
    return NextResponse.json({ erro: "user nao encontrado" }, { status: 401 });
  }

  // Verifica role superadmin
  const rRole = await sbAdmin
    .from("usuarios")
    .select("role")
    .eq("auth_id", authUserId)
    .maybeSingle();
  if (rRole.error || rRole.data?.role !== "superadmin") {
    logWarn("criar_cliente_acesso_negado", { ip, authUserId, role: rRole.data?.role });
    return NextResponse.json({ erro: "acesso negado (requer superadmin)" }, { status: 403 });
  }

  // 2) Valida payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "body invalido" }, { status: 400 });
  }

  const nome = String(body.nome || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const senha = String(body.senha_inicial || "");
  const planoId = body.plano_id || null;
  const telefone = body.telefone ? String(body.telefone).trim() : null;

  if (!nome) return NextResponse.json({ erro: "nome obrigatorio" }, { status: 400 });
  if (!email || !email.includes("@")) {
    return NextResponse.json({ erro: "email invalido" }, { status: 400 });
  }
  if (senha.length < 8) {
    return NextResponse.json({ erro: "senha precisa de 8+ caracteres" }, { status: 400 });
  }

  // 3) Cria auth user via Admin API
  const rAuth = await sbAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (rAuth.error || !rAuth.data.user) {
    logErro("criar_cliente_auth_falhou", rAuth.error || new Error("user vazio"), { ip, email });
    return NextResponse.json(
      { erro: "falha ao criar auth: " + (rAuth.error?.message || "?") },
      { status: 500 },
    );
  }
  const novoAuthId = rAuth.data.user.id;

  // 4) Cria registro em public.usuarios com role='admin' (dono de fazenda)
  const rIns = await sbAdmin
    .from("usuarios")
    .insert({
      auth_id: novoAuthId,
      nome,
      email,
      role: "admin",
      telefone,
      plano_id: planoId,
      fazenda_id: null,
      ativo: true,
    })
    .select("id")
    .single();

  if (rIns.error || !rIns.data) {
    logErro("criar_cliente_insert_falhou", rIns.error || new Error("data vazio"), { ip, email, novoAuthId });
    // Rollback: deleta auth user pra nao deixar orfao
    await sbAdmin.auth.admin.deleteUser(novoAuthId).catch(() => {});
    return NextResponse.json(
      { erro: "falha ao criar usuario: " + (rIns.error?.message || "?") },
      { status: 500 },
    );
  }

  logInfo("criar_cliente_ok", {
    ip,
    autor_auth_id: authUserId,
    novo_usuario_id: rIns.data.id,
    novo_email: email,
    plano_id: planoId,
  });

  return NextResponse.json({
    ok: true,
    usuario_id: rIns.data.id,
    email,
  });
}
