function "shared/normalize_domain" {
  description = "Normalize a URL or domain to its canonical host name."
  input {
    text? domain
  }

  stack {
    var $normalized { value = ($input.domain ?? "")|trim|to_lower }
    var.update $normalized { value = $normalized|replace:"https://":""|replace:"http://":"" }
    var.update $normalized { value = $normalized|replace:"www.":"" }
    var.update $normalized { value = ($normalized|split:"/")|first }
    var.update $normalized { value = ($normalized|split:"?")|first }
    var.update $normalized { value = ($normalized|split:"#")|first }
  }

  response = $normalized
  guid = "4qNJubBPBI2FwrnAjEd91O8ksoQ"
}
