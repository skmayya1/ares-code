import appIconUrl from "../../../../assets/ares/apple-touch-icon.png";

export function T3AppIcon(props: { readonly className?: string }) {
  return <img src={appIconUrl} alt="" className={props.className} />;
}
