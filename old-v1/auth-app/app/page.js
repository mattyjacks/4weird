export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '60px auto', padding: 20 }}>
      <h1>4weird Auth API</h1>
      <p>
        This service handles 4weird logins and user data. There is no website
        here - open <a href="https://4weird.com/account.html">4weird.com/account.html</a> to
        log in. Health: <a href="/api/health">/api/health</a>.
      </p>
    </main>
  );
}
