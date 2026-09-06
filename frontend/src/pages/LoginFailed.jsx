import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LoginFailed() {
  return (
    <div className="page">
      <Navbar />
      <main className="page-body">
        <div className="shell">
          <h1 className="display-lg">Sign-in didn't go through</h1>
          <p className="lede" style={{ marginTop: 16 }}>
            Something went wrong while signing you in with Google. Please try again.
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
