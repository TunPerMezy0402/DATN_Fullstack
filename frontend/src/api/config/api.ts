const getApiUrl = () => {
  // Ưu tiên dùng env variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback về localhost khi dev
  return 'http://127.0.0.1:8000/api';
};

const getImageBaseUrl = () => {
  if (process.env.REACT_APP_IMAGE_BASE_URL) {
    return process.env.REACT_APP_IMAGE_BASE_URL;
  }
  
  return 'http://127.0.0.1:8000/';
};

export const API_URL = getApiUrl();
export const IMAGE_BASE_URL = getImageBaseUrl();
export const FREE_SHIPPING_THRESHOLD = 500000;
export const STANDARD_SHIPPING_FEE = 30000;
export const VNPAY_MIN = 10000;
export const VNPAY_MAX = 500000000;