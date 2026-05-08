query "email_outbox" verb=POST {
  api_group = "Scaler Outreach"
  description = "Create an email outbox record"

  input {
    int outreach_draft_id { table = "outreach_draft" }
    int company_id { table = "company" }
    int? prospect_id { table = "prospect" }
    text? to_email filters=trim
    text? to_name filters=trim
    text subject filters=trim
    text body filters=trim
    enum? status?="drafted" {
      values = ["drafted", "approved_to_send", "send_requested", "sent", "failed", "cancelled"]
    }
    enum? send_provider?="unknown" {
      values = ["superhuman", "gmail", "manual", "unknown"]
    }
    text? approved_by filters=trim
    timestamp? approved_at
    timestamp? send_requested_at
    timestamp? sent_at
    text? failure_reason filters=trim
    json? metadata_json
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    conditional {
      if ($input.to_email != null) {
        function.run "shared/normalize_domain" {
          input = { domain: (($input.to_email|split:"@")|last) }
        } as $email_domain

        db.query "suppression" {
          where = $db.suppression.email == $input.to_email || $db.suppression.domain == $email_domain
          return = { type: "single" }
        } as $suppression

        precondition ($suppression == null) {
          error_type = "standard"
          error = "Suppressed recipient"
        }
      }
    }

    db.add "email_outbox" {
      data = {
        outreach_draft_id: $input.outreach_draft_id,
        company_id: $input.company_id,
        prospect_id: $input.prospect_id,
        to_email: $input.to_email,
        to_name: $input.to_name,
        subject: $input.subject,
        body: $input.body,
        status: $input.status ?? "drafted",
        send_provider: $input.send_provider ?? "unknown",
        approved_by: $input.approved_by,
        approved_at: $input.approved_at,
        send_requested_at: $input.send_requested_at,
        sent_at: $input.sent_at,
        failure_reason: $input.failure_reason,
        metadata_json: $input.metadata_json
      }
    } as $email_outbox

    db.add "email_event" {
      data = {
        email_outbox_id: $email_outbox.id,
        outreach_draft_id: $input.outreach_draft_id,
        event_type: "created",
        provider: $input.send_provider ?? "unknown",
        payload_json: {
          status: $input.status ?? "drafted",
          to_email: $input.to_email,
          subject: $input.subject
        }
      }
    } as $email_event
  }

  response = $email_outbox
  guid = "OIqBxfCyIxB-y55rBhpZaERvLYU"
}
