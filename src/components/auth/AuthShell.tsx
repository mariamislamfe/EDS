import Image from "next/image";

export function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-14">
      <div className="w-full max-w-md">
        <Image src="/brand/eds-mark.png" alt="" width={56} height={56} className="mb-6" />
        <h1 className="mb-8 text-3xl font-bold tracking-[-0.02em]">{title}</h1>
        {children}
        {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
