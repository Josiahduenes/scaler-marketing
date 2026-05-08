query "companies/upsert" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update a company record"

  input {
    text name filters=trim
    text domain filters=trim
    text? website_url filters=trim
    text? industry filters=trim
    int? employee_count_min
    int? employee_count_max
    text? revenue_estimate filters=trim
    text? city filters=trim
    text? state filters=trim
    text? country filters=trim
    text? ownership_type filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    function.run "shared/normalize_domain" {
      input = { domain: $input.domain }
    } as $normalized_domain

    db.add_or_edit "company" {
      field_name = "domain"
      field_value = $normalized_domain
      data = {
        name: $input.name,
        domain: $normalized_domain,
        website_url: $input.website_url,
        industry: $input.industry,
        employee_count_min: $input.employee_count_min,
        employee_count_max: $input.employee_count_max,
        revenue_estimate: $input.revenue_estimate,
        city: $input.city,
        state: $input.state,
        country: $input.country ?? "US",
        ownership_type: $input.ownership_type,
        updated_at: now
      }
    } as $company
  }

  response = $company
  guid = "qLe_SRX7LWyOpfqdeDvd3YbpyRM"
}
