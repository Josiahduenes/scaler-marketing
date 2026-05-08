query "suppressions/by-email" verb=GET {
  api_group = "Scaler Outreach"
  description = "Look up a suppression by email or email domain"

  input {
    text email filters=trim
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    var $normalized_email { value = $input.email|trim|to_lower }
    db.get "suppression" {
      field_name = "email"
      field_value = $normalized_email
    } as $email_suppression

    conditional {
      if ($email_suppression == null) {
        function.run "shared/normalize_domain" {
          input = { domain: (($normalized_email|split:"@")|last) }
        } as $email_domain

        db.get "suppression" {
          field_name = "domain"
          field_value = $email_domain
        } as $domain_suppression
      }
    }
  }

  response = $email_suppression ?? $domain_suppression
  guid = "VA9M6EuWFtUTjtCFDyMGDSVmDlE"
}
