export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="portal-layout" className="h-screen flex flex-col w-full bg-black text-zinc-100">
      {children}
    </div>
  );
}
