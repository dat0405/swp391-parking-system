import axiosClient from "./axiosClient";

export const reportDashboardApi = {
  /**
   * Lấy báo cáo theo Today, Week hoặc Month.
   *
   * Endpoint:
   * GET /api/report-dashboard?range=WEEK
   */
  getReportDashboard: (range = "WEEK") =>
    axiosClient.get(
      "/report-dashboard",
      {
        params: {
          range
        }
      }
    ),

  /**
   * Lấy dữ liệu so sánh theo tháng.
   *
   * Endpoint:
   * GET /api/reports/monthly-comparison?months=6
   */
  getMonthlyComparison: (months = 6) => {
    const normalizedMonths = Number(months);

    const safeMonths =
      Number.isInteger(normalizedMonths) &&
      normalizedMonths >= 1 &&
      normalizedMonths <= 12
        ? normalizedMonths
        : 6;

    return axiosClient.get(
      "/reports/monthly-comparison",
      {
        params: {
          months: safeMonths
        }
      }
    );
  }
};