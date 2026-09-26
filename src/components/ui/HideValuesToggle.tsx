import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { useValuesHidden } from "@/lib/privacy";

/** Botão de "olho": mostra ou esconde os valores em R$ (vale para todas as telas). */
export default function HideValuesToggle() {
  const [hidden, setHidden] = useValuesHidden();
  const label = hidden ? "Mostrar valores" : "Ocultar valores";
  return (
    <button type="button" className="btn-secondary !px-3" title={label} aria-pressed={hidden} onClick={() => setHidden(!hidden)}>
      {hidden ? <HiOutlineEyeSlash className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}
