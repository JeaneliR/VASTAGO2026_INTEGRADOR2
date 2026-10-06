// Referencias Bibliográficas (APA 7, en español). Cada fuente fue consultada o verificada el 06-oct-2026.
// Orden alfabético por autor; el campo `k` es la clave de orden. Los títulos en cursiva se marcan con __ __.
module.exports = (g) => {
  const { H1 } = g;
  // P local: gen.js P pasa bold/italics = undefined a runs() y anula **negrita** y __cursiva__; aquí no se pasan esas claves.
  const P = (text, o = {}) => new g.D.Paragraph({ children: g.runs(text, { size: o.size || 22, color: o.color }), alignment: o.align || g.AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 120, line: 300, before: o.before || 0 }, indent: o.indent, keepNext: o.keepNext });

  const RC = "Recuperado el 6 de octubre de 2026, de ";

  const E = [
    { k: "CIEN-ADEX 2025", t: "CIEN-ADEX. (2025, 2 de mayo). __Cacao y derivados: Evolución del mercado internacional y nacional__. https://cien.adexperu.org.pe/informacion-estrategica/cacao-y-derivados-evolucion-del-mercado-internacional-y-nacional/" },
    { k: "Congreso 2011", t: "Congreso de la República del Perú. (2011). __Ley N.° 29733, Ley de Protección de Datos Personales__. Diario Oficial El Peruano." },
    { k: "Docker", t: "Docker. (s. f.). __Multi-stage builds__. Docker Docs. " + RC + "https://docs.docker.com/build/building/multi-stage/" },
    { k: "Dworkin 2007", t: "Dworkin, M. (2007). __Recommendation for block cipher modes of operation: Galois/Counter Mode (GCM) and GMAC__ (NIST Special Publication 800-38D). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-38D" },
    { k: "Fowler 2002", t: "Fowler, M. (2002). __Patterns of enterprise application architecture__. Addison-Wesley." },
    { k: "Google 2024", t: "Google. (2024). __Web Vitals__. web.dev. " + RC + "https://web.dev/articles/vitals" },
    { k: "Grassi 2017", t: "Grassi, P. A., Fenton, J. L., Newton, E. M., Perlner, R. A., Regenscheid, A. R., Burr, W. E., Richer, J. P., Lefkovitz, N. B., Danker, J. M., Choong, Y.-Y., Greene, K. K., y Theofanos, M. F. (2017). __Digital identity guidelines: Authentication and lifecycle management__ (NIST Special Publication 800-63B). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-63b" },
    { k: "Gunicorn", t: "Gunicorn. (s. f.). __Gunicorn - WSGI server__. " + RC + "https://docs.gunicorn.org/en/stable/" },
    { k: "Hyndman 2021", t: "Hyndman, R. J., y Athanasopoulos, G. (2021). __Forecasting: Principles and practice__ (3.ª ed.). OTexts. https://otexts.com/fpp3/" },
    { k: "IEEE 2008", t: "IEEE. (2008). __IEEE standard for software and system test documentation__ (IEEE Std 829-2008). Institute of Electrical and Electronics Engineers. https://standards.ieee.org/ieee/829/3787/" },
    { k: "ISO/IEC 2022", t: "ISO/IEC. (2022). __Information security, cybersecurity and privacy protection — Information security management systems — Requirements__ (ISO/IEC 27001:2022). International Organization for Standardization. https://www.iso.org/standard/27001" },
    { k: "ISO/IEC/IEEE 2021", t: "ISO/IEC/IEEE. (2021). __Software and systems engineering — Software testing — Part 3: Test documentation__ (ISO/IEC/IEEE 29119-3:2021). International Organization for Standardization. https://www.iso.org/standard/79429.html" },
    { k: "Jones 2015", t: "Jones, M., Bradley, J., y Sakimura, N. (2015). __JSON Web Token (JWT)__ (RFC 7519). Internet Engineering Task Force. https://doi.org/10.17487/RFC7519" },
    { k: "Kirkpatrick 2018", t: "Kirkpatrick, A., O'Connor, J., Campbell, A., y Cooper, M. (Eds.). (2018). __Web Content Accessibility Guidelines (WCAG) 2.1__. World Wide Web Consortium. https://www.w3.org/TR/WCAG21/" },
    { k: "Maurya 2012", t: "Maurya, A. (2012). __Running lean: Iterate from plan A to a plan that works__ (2.ª ed.). O'Reilly Media." },
    { k: "Meucci 2021", t: "Meucci, M., y van der Stock, A. (2021). __OWASP Application Security Verification Standard 4.0.3__. OWASP Foundation. https://owasp.org/www-project-application-security-verification-standard/" },
    { k: "National Institute 2024", t: "National Institute of Standards and Technology. (2024). __The NIST Cybersecurity Framework (CSF) 2.0__ (NIST Cybersecurity White Paper 29). https://doi.org/10.6028/NIST.CSWP.29" },
    { k: "Newman 2010", t: "Newman, C., Menon-Sen, A., Melnikov, A., y Williams, N. (2010). __Salted Challenge Response Authentication Mechanism (SCRAM) SASL and GSS-API mechanisms__ (RFC 5802). Internet Engineering Task Force. https://doi.org/10.17487/RFC5802" },
    { k: "Nielsen 1994", t: "Nielsen, J. (1994, 24 de abril). __10 usability heuristics for user interface design__. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/" },
    { k: "OWASP 2020", t: "OWASP Foundation. (2020). __OWASP Web Security Testing Guide__ (v4.2). https://wstg.owasp.org/v4.2/" },
    { k: "OWASP 2021", t: "OWASP Foundation. (2021). __OWASP Top 10:2021__. https://owasp.org/Top10/" },
    { k: "OWASP 2024", t: "OWASP Foundation. (2024). __Password storage cheat sheet__. OWASP Cheat Sheet Series. " + RC + "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
    { k: "Pallets", t: "Pallets Projects. (s. f.). __Flask documentation__ (3.1.x). " + RC + "https://flask.palletsprojects.com/en/stable/" },
    { k: "PostgreSQL 2025", t: "PostgreSQL Global Development Group. (2025). __PostgreSQL 16 documentation__. " + RC + "https://www.postgresql.org/docs/16/" },
    { k: "pytest", t: "pytest-dev. (s. f.). __pytest documentation__. " + RC + "https://docs.pytest.org/en/stable/" },
    { k: "Provos 1999", t: "Provos, N., y Mazières, D. (1999). A future-adaptable password scheme. __Proceedings of the USENIX Annual Technical Conference, FREENIX Track__ (pp. 81-91). USENIX Association. https://www.usenix.org/legacy/publications/library/proceedings/usenix99/provos.html" },
    { k: "React Team 2025", t: "React Team. (2025, 14 de febrero). __Sunsetting Create React App__ [Entrada de blog]. React. https://react.dev/blog/2025/02/14/sunsetting-create-react-app" },
    // Render: las letras (a-f) siguen el orden de uso en los capítulos 7, 8, 10 y 11; el sufijo -a corresponde a «Deploy for free».
    { k: "Render a", t: "Render. (s. f.-a). __Deploy for free__. " + RC + "https://render.com/docs/free" },
    { k: "Render b", t: "Render. (s. f.-b). __Blueprint specification__. " + RC + "https://render.com/docs/blueprint-spec" },
    { k: "Render c", t: "Render. (s. f.-c). __Creating and connecting to Render Postgres databases__. " + RC + "https://render.com/docs/postgresql-creating-connecting" },
    { k: "Render d", t: "Render. (s. f.-d). __Health checks__. " + RC + "https://render.com/docs/health-checks" },
    { k: "Render e", t: "Render. (s. f.-e). __Rollbacks__. " + RC + "https://render.com/docs/rollbacks" },
    { k: "Render f", t: "Render. (s. f.-f). __Web services__. " + RC + "https://render.com/docs/web-services" },
    { k: "Rescorla 2018", t: "Rescorla, E. (2018). __The Transport Layer Security (TLS) protocol version 1.3__ (RFC 8446). Internet Engineering Task Force. https://doi.org/10.17487/RFC8446" },
    { k: "Schwaber 2020", t: "Schwaber, K., y Sutherland, J. (2020). __The 2020 Scrum Guide__. https://scrumguides.org/scrum-guide.html" },
  ];
  E.sort((a, b) => a.k.localeCompare(b.k, "es", { sensitivity: "base" }));

  return [
    H1("Referencias Bibliográficas"),
    P("Las fuentes se citan en formato APA 7.ª edición. Las páginas web cuyo contenido cambia con el tiempo indican la fecha de consulta.", { after: 160 }),
    ...E.map((e) => P(e.t, { align: g.AlignmentType.LEFT, indent: { left: 540, hanging: 540 }, after: 110 })),
  ];
};
