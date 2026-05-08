query "health" verb=GET {
  api_group = "Scaler Outreach"
  description = "Health check for the Scaler Outreach backend"

  input {
  }

  stack {
  }

  response = {
    ok: true,
    service: "scaler_outreach",
    timestamp: now
  }
  guid = "3rLqqjo-xYG3q4sxr5kLOPXcbiw"
}
