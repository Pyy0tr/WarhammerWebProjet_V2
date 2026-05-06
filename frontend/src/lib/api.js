const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('ph_token')
}

async function request(method, path, body, isForm = false) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let encoded
  if (isForm) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    encoded = new URLSearchParams(body).toString()
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    encoded = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: encoded })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get:      (path)        => request('GET',    path),
  post:     (path, body)  => request('POST',   path, body),
  put:      (path, body)  => request('PUT',    path, body),
  patch:    (path, body)  => request('PATCH',  path, body),
  delete:   (path)        => request('DELETE', path),
  postForm: (path, body)  => request('POST',   path, body, true),
}
