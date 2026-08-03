const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  stats: () => request('/api/stats'),

  listCreators: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString()
    return request(`/api/creators${qs ? `?${qs}` : ''}`)
  },
  createCreator: (data) => request('/api/creators', { method: 'POST', body: JSON.stringify(data) }),
  updateCreator: (id, data) =>
    request(`/api/creators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCreator: (id) => request(`/api/creators/${id}`, { method: 'DELETE' }),

  listCampaigns: () => request('/api/campaigns'),
  getCampaign: (id) => request(`/api/campaigns/${id}`),
  createCampaign: (data) => request('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id, data) =>
    request(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCampaign: (id) => request(`/api/campaigns/${id}`, { method: 'DELETE' }),

  getMatches: (campaignId) => request(`/api/campaigns/${campaignId}/matches`),
  setMatchStatus: (campaignId, creatorId, status) =>
    request(`/api/campaigns/${campaignId}/matches/${creatorId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
}
