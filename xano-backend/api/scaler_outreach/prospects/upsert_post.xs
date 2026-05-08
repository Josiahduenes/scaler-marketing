query "prospects/upsert" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update a prospect record"

  input {
    int company_id { table = "company" }
    text? name filters=trim
    text title filters=trim
    enum? role_type?="unknown" {
      values = ["buyer", "champion", "unknown"]
    }
    text? linkedin_url filters=trim
    text? email filters=trim
    decimal? confidence?=0.5
    text? source_url filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $dedupe_key {
      value = (($input.company_id|to_text)|concat:":":(($input.title|trim|to_lower)))|concat:":":((($input.name ?? "unknown")|trim|to_lower))
    }

    db.add_or_edit "prospect" {
      field_name = "dedupe_key"
      field_value = $dedupe_key
      data = {
        dedupe_key: $dedupe_key,
        company_id: $input.company_id,
        name: $input.name,
        title: $input.title,
        role_type: $input.role_type ?? "unknown",
        linkedin_url: $input.linkedin_url,
        email: $input.email,
        confidence: $input.confidence ?? 0.5,
        source_url: $input.source_url,
        updated_at: now
      }
    } as $prospect
  }

  response = $prospect
  guid = "8pe-iMeSEPf5pEeyC-XAVQjUP3o"
}
