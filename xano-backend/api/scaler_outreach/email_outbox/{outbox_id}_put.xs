query "email_outbox/{outbox_id}" verb=PUT {
  api_group = "Scaler Outreach"
  description = "Update an email outbox record"

  input {
    int outbox_id { table = "email_outbox" }
    enum? status {
      values = ["drafted", "approved_to_send", "send_requested", "sent", "failed", "cancelled"]
    }
    enum? send_provider {
      values = ["superhuman", "gmail", "manual", "unknown"]
    }
    text? provider_message_id filters=trim
    text? provider_thread_id filters=trim
    text? approved_by filters=trim
    timestamp? approved_at
    timestamp? send_requested_at
    timestamp? sent_at
    text? failure_reason filters=trim
    json? metadata_json
    timestamp? updated_at
  }

  stack {
    function.run "security/require_service_token" {
      input = {}
    } as $auth_check

    db.get "email_outbox" {
      field_name = "id"
      field_value = $input.outbox_id
    } as $existing_outbox

    precondition ($existing_outbox != null) {
      error_type = "notfound"
      error = "Email outbox record not found"
    }

    var $updates { value = { updated_at: $input.updated_at ?? now } }

    conditional {
      if ($input.status != null) {
        var.update $updates { value = $updates|set:"status":$input.status }
      }
    }
    conditional {
      if ($input.send_provider != null) {
        var.update $updates { value = $updates|set:"send_provider":$input.send_provider }
      }
    }
    conditional {
      if ($input.provider_message_id != null) {
        var.update $updates { value = $updates|set:"provider_message_id":$input.provider_message_id }
      }
    }
    conditional {
      if ($input.provider_thread_id != null) {
        var.update $updates { value = $updates|set:"provider_thread_id":$input.provider_thread_id }
      }
    }
    conditional {
      if ($input.approved_by != null) {
        var.update $updates { value = $updates|set:"approved_by":$input.approved_by }
      }
    }
    conditional {
      if ($input.approved_at != null) {
        var.update $updates { value = $updates|set:"approved_at":$input.approved_at }
      }
    }
    conditional {
      if ($input.send_requested_at != null) {
        var.update $updates { value = $updates|set:"send_requested_at":$input.send_requested_at }
      }
    }
    conditional {
      if ($input.sent_at != null) {
        var.update $updates { value = $updates|set:"sent_at":$input.sent_at }
      }
    }
    conditional {
      if ($input.failure_reason != null) {
        var.update $updates { value = $updates|set:"failure_reason":$input.failure_reason }
      }
    }
    conditional {
      if ($input.metadata_json != null) {
        var.update $updates { value = $updates|set:"metadata_json":$input.metadata_json }
      }
    }

    db.patch "email_outbox" {
      field_name = "id"
      field_value = $input.outbox_id
      data = $updates
    } as $email_outbox

    conditional {
      if ($input.status != null) {
        db.add "email_event" {
          data = {
            email_outbox_id: $email_outbox.id,
            outreach_draft_id: $email_outbox.outreach_draft_id,
            event_type: $input.status == "approved_to_send" ? "approved" : $input.status == "send_requested" ? "send_requested" : $input.status == "sent" ? "sent" : $input.status == "failed" ? "failed" : "cancelled",
            provider: $input.send_provider ?? $email_outbox.send_provider ?? "unknown",
            payload_json: {
              status: $input.status,
              provider_message_id: $input.provider_message_id,
              provider_thread_id: $input.provider_thread_id,
              failure_reason: $input.failure_reason
            }
          }
        } as $email_event
      }
    }
  }

  response = $email_outbox
  guid = "YbRZ3LnltCmH166jrqnzcFgYio8"
}
