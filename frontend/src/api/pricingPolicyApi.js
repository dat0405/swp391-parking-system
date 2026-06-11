import axiosClient from "./axiosClient";

export const pricingPolicyApi = {
  getPricingPolicies() {
    return axiosClient.get("/pricing-policies");
  },

  getPricingPolicyById(id) {
    return axiosClient.get(`/pricing-policies/${id}`);
  },

  createPricingPolicy(data) {
    return axiosClient.post("/pricing-policies", data);
  },

  updatePricingPolicy(id, data) {
    return axiosClient.put(`/pricing-policies/${id}`, data);
  },

  updatePricingPolicyStatus(id, status) {
    return axiosClient.put(`/pricing-policies/${id}/status`, {
      status,
    });
  },

  disablePricingPolicy(id) {
    return axiosClient.delete(`/pricing-policies/${id}`);
  },

  getPricingPoliciesByVehicleType(vehicleTypeId) {
    return axiosClient.get(`/pricing-policies/vehicle-type/${vehicleTypeId}`);
  },
};