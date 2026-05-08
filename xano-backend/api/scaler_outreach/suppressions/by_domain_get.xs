query "suppressions/by-domain" verb=GET {
  api_group = "Scaler Outreach"
  description = "Look up a suppression by domain"

  input {
    text domain filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    function.run "shared/normalize_domain" {
      input = { domain: $input.domain }
    } as $normalized_domain

    db.get "suppression" {
      field_name = "domain"
      field_value = $normalized_domain
    } as $suppression
  }

  response = $suppression
  guid = "WxIMEMPJ6db2O9Gia7PkvuQvERM"
}
