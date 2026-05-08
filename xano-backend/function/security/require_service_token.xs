function "security/require_service_token" {
  description = "Reject requests that do not present the configured Xano service token."
  input {
  }

  stack {
    var $headers { value = $env.$http_headers }
    var $authorization { value = ($headers|get:"authorization") ?? ($headers|get:"Authorization") ?? "" }

    precondition ($authorization == ("Bearer " ~ $env.XANO_API_TOKEN)) {
      error_type = "accessdenied"
      error = "Unauthorized"
    }
  }

  response = { authorized: true }
  guid = "d7YLMTfnpiw_WRqlNmVaSQGuzoM"
}
