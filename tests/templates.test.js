import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  renderErrorHtml,
  renderSecretHtml,
  renderUnauthorizedHtml,
} from "../src/views/templates.js";

describe("HTML templates", () => {
  it("escapes HTML characters to prevent XSS", () => {
    const payload = `<script>alert("xss")</script> & 'test'`;
    const escaped = escapeHtml(payload);
    assert.equal(
      escaped,
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;"
    );

    const html = renderSecretHtml(payload);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
  });

  it("includes design-system tokens and accessible error roles", () => {
    const unauth = renderUnauthorizedHtml("Invalid credentials");
    assert.match(unauth, /#0F172A/);
    assert.match(unauth, /#1E293B/);
    assert.match(unauth, /#3B82F6/);
    assert.match(unauth, /#EF4444/);
    assert.match(unauth, /role="alert"/);
    assert.match(unauth, /Try Again/);

    const errPage = renderErrorHtml({
      statusCode: 404,
      badgeText: "HTTP 404 NOT FOUND",
      heading: "Page Not Found",
      description: "Missing route",
      errorMessage: "Not Found",
    });
    assert.match(errPage, /HTTP 404 NOT FOUND/);
    assert.match(errPage, /Back to Home/);
  });
});
