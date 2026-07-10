import { PageFrame } from "@/components/layout/page-frame";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PageFrame compact className="justify-center">
      <div className="page-pad flex w-full flex-1 items-center justify-center py-8">
        {children}
      </div>
    </PageFrame>
  );
}
