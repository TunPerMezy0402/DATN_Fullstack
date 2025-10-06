// src/layouts/partials/Footer.tsx
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="sticky-footer bg-white border-top">
      <div className="container my-auto">
        <div className="row">
          <div className="col-md-6">
            <div className="copyright text-center text-md-start my-auto">
              <span>Copyright &copy; Admin Panel {currentYear}</span>
            </div>
          </div>
          <div className="col-md-6">
            <div className="text-center text-md-end">
              <a href="#" className="text-decoration-none me-3">
                <i className="fas fa-fw fa-question-circle"></i> Trợ giúp
              </a>
              <a href="#" className="text-decoration-none me-3">
                <i className="fas fa-fw fa-envelope"></i> Liên hệ
              </a>
              <a href="#" className="text-decoration-none">
                <i className="fas fa-fw fa-info-circle"></i> Về chúng tôi
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;