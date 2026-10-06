from .base import BaseRepository


class UsuarioRepository(BaseRepository):
    tabla = "usuarios"

    def find_by_email(self, email):
        return self._run(
            "SELECT u.*, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id "
            "WHERE lower(u.email) = lower(%s)", (email,), one=True)

    def get_con_rol(self, id_):
        return self._run(
            "SELECT u.id, u.nombre, u.email, u.activo, u.ultimo_acceso, u.telefono_cifrado, r.nombre AS rol "
            "FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = %s", (id_,), one=True)

    def listar(self):
        return self._run(
            "SELECT u.id, u.nombre, u.email, u.activo, u.ultimo_acceso, r.nombre AS rol "
            "FROM usuarios u JOIN roles r ON r.id = u.rol_id ORDER BY u.id")

    def crear(self, nombre, email, password_hash, rol, telefono_cifrado=None):
        return self._run(
            "INSERT INTO usuarios (nombre, email, password_hash, rol_id, telefono_cifrado) "
            "SELECT %s, %s, %s, r.id, %s FROM roles r WHERE r.nombre = %s "
            "RETURNING id, nombre, email", (nombre, email, password_hash, telefono_cifrado, rol), one=True)

    def registrar_fallo(self, id_, max_intentos, minutos_bloqueo):
        return self._run(
            "UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1, "
            "bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= %s THEN now() + (%s || ' minutes')::interval "
            "ELSE bloqueado_hasta END WHERE id = %s RETURNING intentos_fallidos, bloqueado_hasta",
            (max_intentos, str(minutos_bloqueo), id_), one=True)

    def registrar_acceso(self, id_):
        self._run("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() "
                  "WHERE id = %s", (id_,))

    def cambiar_estado(self, id_, activo):
        return self._run("UPDATE usuarios SET activo = %s WHERE id = %s RETURNING id, activo", (activo, id_), one=True)


class SesionRepository(BaseRepository):
    tabla = "sesiones"

    def crear(self, usuario_id, token_hash, expira_en, ip, user_agent):
        self._run("INSERT INTO sesiones (usuario_id, token_hash, expira_en, ip, user_agent) "
                  "VALUES (%s,%s,%s,%s,%s)", (usuario_id, token_hash, expira_en, ip, (user_agent or "")[:200]))

    def buscar_valida(self, token_hash):
        return self._run("SELECT * FROM sesiones WHERE token_hash = %s AND NOT revocada AND expira_en > now()",
                         (token_hash,), one=True)

    def revocar(self, token_hash):
        self._run("UPDATE sesiones SET revocada = TRUE WHERE token_hash = %s", (token_hash,))

    def revocar_todas(self, usuario_id):
        self._run("UPDATE sesiones SET revocada = TRUE WHERE usuario_id = %s AND NOT revocada", (usuario_id,))
