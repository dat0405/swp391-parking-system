import axiosClient from "./axiosClient";

export const reportDashboardApi = {
  getReportDashboard: (range = "WEEK") =>
    axiosClient.get(`/report-dashboard?range=${range}`),
};