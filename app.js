(function () {
  "use strict";

  function el(id) {
    return document.getElementById(id);
  }

  function showMessage(message) {
    const msg = el("msg");
    if (msg) msg.textContent = message;
  }

  // Vérification de la configuration
  if (!window.SUPABASE_URL) {
    showMessage("Fehler: SUPABASE_URL wurde nicht geladen.");
    console.error("SUPABASE_URL fehlt. Prüfe config.js.");
    return;
  }

  if (!window.SUPABASE_PUBLISHABLE_KEY) {
    showMessage("Fehler: Supabase Publishable Key wurde nicht geladen.");
    console.error("SUPABASE_PUBLISHABLE_KEY fehlt. Prüfe config.js.");
    return;
  }

  if (!window.supabase) {
    showMessage("Fehler: Supabase-Bibliothek wurde nicht geladen.");
    console.error("window.supabase fehlt.");
    return;
  }

  const client = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  window.graceTestDaF = client;

  window.signup = async function () {
    const email = el("se").value.trim();
    const password = el("sp").value;
    const displayName = el("sn").value.trim();

    if (!email || !password) {
      showMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    showMessage("Konto wird erstellt...");

    const result = await client.auth.signUp({
      email: email,
      password: password
    });

    if (result.error) {
      showMessage(result.error.message);
      console.error(result.error);
      return;
    }

    if (result.data.user) {
      const profileResult = await client
        .from("profiles")
        .upsert({
          id: result.data.user.id,
          display_name: displayName || email.split("@")[0]
        });

      if (profileResult.error) {
        showMessage(profileResult.error.message);
        console.error(profileResult.error);
        return;
      }

      showMessage(
        "Konto erstellt. Prüfe deine E-Mail, falls eine Bestätigung erforderlich ist."
      );
    }
  };

  window.login = async function () {
    const email = el("le").value.trim();
    const password = el("lp").value;

    if (!email || !password) {
      showMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    const result = await client.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) {
      showMessage(result.error.message);
      return;
    }

    showMessage("");
    await showDashboard(result.data.user);
  };

  window.logout = async function () {
    await client.auth.signOut();
  };

  async function showDashboard(user) {
    el("login").classList.add("hidden");
    el("dash").classList.remove("hidden");

    const profileResult = await client
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const name =
      profileResult.data?.display_name || user.email;

    el("hello").textContent = "Bonjour " + name + " !";

    const resultsResult = await client
      .from("test_results")
      .select("module,tdn,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const results = resultsResult.data || [];

    el("tests").textContent =
      results.filter(function (x) {
        return x.module === "complete";
      }).length;

    const modules = {
      Lesen: "lesen",
      Hören: "hoeren",
      Schreiben: "schreiben",
      Sprechen: "sprechen"
    };

    Object.keys(modules).forEach(function (moduleName) {
      const result = results.find(function (x) {
        return x.module === moduleName;
      });

      el(modules[moduleName]).textContent =
        result ? "TDN " + result.tdn : "–";
    });
  }

  window.ranking = async function () {
    const result = await client
      .from("leaderboard")
      .select("*")
      .limit(50);

    if (result.error) {
      el("rank").innerHTML =
        '<div class="card">' +
        result.error.message +
        "</div>";
      return;
    }

    el("rank").innerHTML =
      '<div class="card">' +
      "<h3>Gruppenranking</h3>" +
      "<table>" +
      "<tr>" +
      "<th>#</th>" +
      "<th>Name</th>" +
      "<th>Tests</th>" +
      "<th>Lesen</th>" +
      "<th>Hören</th>" +
      "<th>Schreiben</th>" +
      "<th>Sprechen</th>" +
      "</tr>" +
      (result.data || [])
        .map(function (x, i) {
          return (
            "<tr>" +
            "<td>" + (i + 1) + "</td>" +
            "<td>" + (x.display_name || "") + "</td>" +
            "<td>" + (x.tests_completed || 0) + "</td>" +
            "<td>" + (x.lesen_tdn || "–") + "</td>" +
            "<td>" + (x.hoeren_tdn || "–") + "</td>" +
            "<td>" + (x.schreiben_tdn || "–") + "</td>" +
            "<td>" + (x.sprechen_tdn || "–") + "</td>" +
            "</tr>"
          );
        })
        .join("") +
      "</table></div>";
  };

  window.startTest = function () {
    window.location.href = "testdaf-engine-v3.html";
  };

  client.auth.onAuthStateChange(function (_event, session) {
    if (session) {
      showDashboard(session.user);
    } else {
      el("dash").classList.add("hidden");
      el("login").classList.remove("hidden");
    }
  });

  client.auth.getSession().then(function (result) {
    if (result.data.session) {
      showDashboard(result.data.session.user);
    } else {
      el("login").classList.remove("hidden");
    }
  });
})();