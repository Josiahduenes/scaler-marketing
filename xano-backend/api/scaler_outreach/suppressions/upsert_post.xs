query "suppressions/upsert" verb=POST {
  api_group = "Scaler Outreach"
  description = "Insert or update an email or domain suppression"

  input {
    text? email filters=trim
    text? domain filters=trim
    enum reason {
      values = ["unsubscribe", "bounce", "manual_block", "client_conflict", "other"]
    }
    text? source filters=trim
    text? notes filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    precondition ($input.email != null || $input.domain != null) {
      error_type = "inputerror"
      error = "Either email or domain is required"
    }

    conditional {
      if ($input.email != null) {
        var $dedupe_key { value = "email:" ~ ($input.email|trim|to_lower) }
        db.add_or_edit "suppression" {
          field_name = "dedupe_key"
          field_value = $dedupe_key
          data = {
            dedupe_key: $dedupe_key,
            email: $input.email|trim|to_lower,
            domain: null,
            reason: $input.reason,
            source: $input.source,
            notes: $input.notes,
            updated_at: now
          }
        } as $suppression
      }
      else {
        function.run "shared/normalize_domain" {
          input = { domain: $input.domain }
        } as $normalized_domain

        var $dedupe_key { value = "domain:" ~ $normalized_domain }
        db.add_or_edit "suppression" {
          field_name = "dedupe_key"
          field_value = $dedupe_key
          data = {
            dedupe_key: $dedupe_key,
            email: null,
            domain: $normalized_domain,
            reason: $input.reason,
            source: $input.source,
            notes: $input.notes,
            updated_at: now
          }
        } as $suppression
      }
    }
  }

  response = $suppression
  guid = "J68pgxycqnbUhtHH7Mp_4_S6fA4"
}
