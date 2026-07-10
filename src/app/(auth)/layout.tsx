export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="page-container flex flex-1 items-center justify-center py-10">
      {children}
    </div>
  );
}
