// src/api/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // React dev server sẽ proxy sang http://127.0.0.1:8000/api
});

export default api;
