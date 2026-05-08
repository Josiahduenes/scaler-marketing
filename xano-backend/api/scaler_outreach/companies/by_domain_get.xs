query "companies/by-domain" verb=GET {
  api_group = "Scaler Outreach"
  description = "Look up a company by normalized domain"

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

    db.get "company" {
      field_name = "domain"
      field_value = $normalized_domain
    } as $company
  }

  response = $company
  guid = "383e_ISr0HoFI6sJRg17g51eGFM"
}
