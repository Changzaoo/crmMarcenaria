import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "device-streaming-20a455a9";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireFirebaseAuth(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    return res.status(401).json({ erro: "Faça login para acessar a API." });
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      audience: FIREBASE_PROJECT_ID,
      issuer: FIREBASE_ISSUER,
    });

    if (!payload.sub) {
      return res.status(401).json({ erro: "Sessão inválida ou expirada. Entre novamente." });
    }

    req.user = {
      uid: payload.sub,
      email: payload.email || null,
      emailVerified: payload.email_verified === true,
    };
    req.firebaseToken = token;

    return next();
  } catch (_error) {
    return res.status(401).json({ erro: "Sessão inválida ou expirada. Entre novamente." });
  }
}
