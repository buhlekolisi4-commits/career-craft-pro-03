import logo from "@/assets/logo.png";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={logo} alt="Cabinet" className={className} width={64} height={64} />;
}
