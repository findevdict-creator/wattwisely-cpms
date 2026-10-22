# OpenBao keeps platform secrets (Stripe keys, provider credentials) encrypted at rest.
# It only listens on the private Docker network, so TLS is handled by the network boundary.
# Integrated (raft) storage on a single node; more nodes can join later for failover.
storage "raft" {
  path    = "/openbao/file"
  node_id = "openbao-1"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true
}

api_addr      = "http://openbao:8200"
cluster_addr  = "http://openbao:8201"
disable_mlock = true
ui            = false
