#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DOMAIN="${DOMAIN:-aura.com}"
SERVER_IP="${SERVER_IP:-}"
OUTPUT_DIR="${OUTPUT_DIR:-/opt/aura-ca}"
CA_DAYS="${CA_DAYS:-3650}"
CERT_DAYS="${CERT_DAYS:-397}"

if [[ "$EUID" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi
for cmd in openssl install mktemp; do
  command -v "$cmd" >/dev/null || { echo "Missing command: $cmd" >&2; exit 1; }
done
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]] || [[ "$DOMAIN" == .* ]] || [[ "$DOMAIN" == *. ]]; then
  echo "Invalid DOMAIN" >&2; exit 1
fi
if [[ -n "$SERVER_IP" ]] && ! [[ "$SERVER_IP" =~ ^[0-9a-fA-F:.]+$ ]]; then
  echo "Invalid SERVER_IP format" >&2; exit 1
fi

install -d -m 700 "$OUTPUT_DIR" "$OUTPUT_DIR/private" "$OUTPUT_DIR/certs"
CA_KEY="$OUTPUT_DIR/private/rootCA.key"
CA_CERT="$OUTPUT_DIR/certs/rootCA.crt"
SERVER_KEY="$OUTPUT_DIR/private/${DOMAIN}.key"
SERVER_CERT="$OUTPUT_DIR/certs/${DOMAIN}.crt"
CSR="$OUTPUT_DIR/${DOMAIN}.csr"
CONF="$OUTPUT_DIR/${DOMAIN}.cnf"

for file in "$CA_KEY" "$CA_CERT" "$SERVER_KEY" "$SERVER_CERT" "$CSR" "$CONF"; do
  if [[ -e "$file" ]]; then
    echo "Refusing to overwrite existing file: $file" >&2
    exit 1
  fi
done

# Root CA: password-protected RSA private key.
echo '[1/5] Generating encrypted Root CA key (enter a strong passphrase)...'
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 \
  -aes-256-cbc -out "$CA_KEY"
chmod 600 "$CA_KEY"

echo '[2/5] Creating Root CA certificate...'
openssl req -x509 -new -key "$CA_KEY" -sha256 -days "$CA_DAYS" \
  -out "$CA_CERT" \
  -subj "/C=VN/O=Aura Internal/OU=IT/CN=Aura Internal Root CA" \
  -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -addext 'subjectKeyIdentifier=hash'
chmod 644 "$CA_CERT"

echo '[3/5] Generating server key and SAN configuration...'
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$SERVER_KEY"
chmod 600 "$SERVER_KEY"
cat > "$CONF" <<EOF
[req]
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = VN
O = Aura Internal
CN = ${DOMAIN}

[req_ext]
subjectAltName = @alt_names

[server_ext]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = www.${DOMAIN}
DNS.3 = *.${DOMAIN}
EOF
if [[ -n "$SERVER_IP" ]]; then
  printf 'IP.1 = %s\n' "$SERVER_IP" >> "$CONF"
fi
chmod 600 "$CONF"

echo '[4/5] Creating CSR and signing server certificate...'
openssl req -new -key "$SERVER_KEY" -out "$CSR" -config "$CONF"
openssl x509 -req -in "$CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" \
  -CAcreateserial -out "$SERVER_CERT" -days "$CERT_DAYS" \
  -sha256 -extfile "$CONF" -extensions server_ext
chmod 644 "$SERVER_CERT"

echo '[5/5] Verifying certificate...'
openssl verify -CAfile "$CA_CERT" -verify_hostname "$DOMAIN" "$SERVER_CERT"
openssl x509 -in "$SERVER_CERT" -noout -subject -dates -ext subjectAltName

cat <<EOF

SUCCESS
Root CA certificate (import into Windows Trusted Root): $CA_CERT
Server certificate (configure in Nginx):             $SERVER_CERT
Server private key (keep secret):                    $SERVER_KEY
Root CA private key (NEVER distribute):              $CA_KEY

Windows PowerShell (Administrator, after copying rootCA.crt to C:\\Certs):
  Import-Certificate -FilePath 'C:\\Certs\\rootCA.crt' -CertStoreLocation 'Cert:\\LocalMachine\\Root'

Configure internal DNS for ${DOMAIN} to point to your web server.
EOF
