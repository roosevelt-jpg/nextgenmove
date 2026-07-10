export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="page-container mx-auto flex w-full max-w-page flex-1 items-center justify-center py-10">
      {children}
    </div>
  );
}
