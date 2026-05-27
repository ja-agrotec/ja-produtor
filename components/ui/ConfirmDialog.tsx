"use client";
import Modal from "./Modal";

type Props = {
  open: boolean;
  titulo?: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destrutivo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export default function ConfirmDialog({
  open,
  titulo = "Confirmar",
  mensagem,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destrutivo = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onCancelar}
      titulo={titulo}
      larguraMax={420}
      rodape={
        <>
          <button type="button" onClick={onCancelar} className="btn-ghost">
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={destrutivo ? "btn-danger" : "btn-primary"}
          >
            {textoConfirmar}
          </button>
        </>
      }
    >
      <p style={{ color: "var(--text)" }}>{mensagem}</p>
    </Modal>
  );
}
