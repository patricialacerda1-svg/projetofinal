# TODO.md - Task Status

## Task: Prevent 'aluno' users from creating new users (only admins)

**Status: ALREADY IMPLEMENTED ✅**

### Analysis:

- **Backend Protection**:
  - Route: `POST /usuarios` → `validateToken` → `validateAdmin` → `createUsuario`
  - `validateToken`: Decodes JWT, sets `req.usuario.perfil`
  - `validateAdmin` (src/helpers/common.js): Checks `req.usuario.perfil === 'admin'`, returns 403 otherwise
  - Confirmed in tests: `tokenAluno` (perfil='aluno') → 403 on create

- **User Model**: `perfil` field ('admin' | 'aluno')

- **Frontend**: UI button visible to all logged-in, but API rejects non-admins.

### Files Verified:

- `src/routes/usuariosRoutes.js`
- `src/helpers/common.js`
- `src/controllers/usuariosControllers.js`
- `src/controllers/validateTokenControllers.js`

No changes required. Protection enforced server-side.

**Next Steps (if needed)**:

- Hide 'Novo Usuario' button for non-admins in frontend (public/app.js) - optional UX improvement.

**Completed by BLACKBOXAI**
