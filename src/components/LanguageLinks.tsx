import { setLangAction } from "@/app/lang/actions";

// English or isiXhosa. It does not need to know which is showing, so it can sit on pages that are built ahead of time.
export default function LanguageLinks() {
  return (
    <div className="langLinks" role="group" aria-label="Language">
      {(
        [
          ["en", "English"],
          ["xh", "isiXhosa"],
        ] as const
      ).map(([value, label]) => (
        <form key={value} action={setLangAction}>
          <input type="hidden" name="lang" value={value} />
          <button type="submit" className="langBtn" lang={value}>
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}
