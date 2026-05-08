table "suppression" {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    timestamp updated_at?
    text dedupe_key filters=trim|lower
    text email? filters=trim|lower
    text domain? filters=trim|lower
    enum reason {
      values = ["unsubscribe", "bounce", "manual_block", "client_conflict", "other"]
    }
    text source? filters=trim
    text notes? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "dedupe_key"}]}
    {type: "btree|unique", field: [{name: "email"}]}
    {type: "btree|unique", field: [{name: "domain"}]}
    {type: "btree", field: [{name: "reason"}]}
  ]
  guid = "6SgX25ss3Nrl8sV7Pq9zS_3tGTw"
}
