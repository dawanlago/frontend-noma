import { getInitials } from "@/utils/format";

/** Foto/logo ou iniciais. */
export default function EntityAvatar({ name, image, square, size = 36 }: { name: string; image?: string; square?: boolean; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-tan/10 text-[11px] font-semibold text-tan ${square ? "rounded-lg" : "rounded-full"}`}
      style={{ width: size, height: size }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={`h-full w-full ${square ? "object-contain" : "object-cover"}`} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
