// src/layouts/partials/LogoutModal.tsx
import { useNavigate } from 'react-router-dom';
import '../../../../assets/admin/css/LogoutModal.css';
import authService from '../../../../services/authService';



const LogoutModal: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
  await authService.logout();
  window.location.reload(); // 🔄 load lại toàn bộ trang
};


  return (
    <div
      className="modal fade"
      id="logoutModal"
      tabIndex={-1}
      aria-labelledby="logoutModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content border-0 shadow">
          
          <div className="modal-header border-0">
            <h5 className="modal-title fw-semibold" id="logoutModalLabel">
              Xác nhận đăng xuất
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>

          <div className="modal-body text-center py-4">
            <i className="fas fa-sign-out-alt text-warning mb-3" style={{ fontSize: '3rem' }}></i>
            <p className="text-muted mb-0">
              Bạn có chắc chắn muốn đăng xuất?
            </p>
          </div>

          <div className="modal-footer border-0 justify-content-center">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleLogout}
              data-bs-dismiss="modal"
            >
              Đăng xuất
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LogoutModal;