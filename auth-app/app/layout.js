export const metadata = {
  title: '4weird Auth API',
  description: 'Login sessions and user data for 4weird Games. API service, not a website.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ background: '#060b08', color: '#e8f4ff', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
