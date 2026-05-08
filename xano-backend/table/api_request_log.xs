table "api_request_log" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text endpoint filters=trim
    text method filters=trim
    int status_code
    json request_json?
    json response_json?
    text error_message? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "endpoint"}]}
    {type: "btree", field: [{name: "method"}]}
    {type: "btree", field: [{name: "status_code"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
  guid = "VJeUj0-4xxxu2JA3vKn8qc5B9nI"
}
