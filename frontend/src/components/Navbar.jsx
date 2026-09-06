import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link to={user ? "/dashboard" : "/"} className="brand">
          Interview<span>Lens</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <div className="nav-user">
              {user.profileImage ? (
                <img className="nav-avatar" src={user.profileImage} alt="" />
              ) : null}
              <span>{user.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
