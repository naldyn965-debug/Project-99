if (r.invalid) deadTokens.push(t);
            else stats.errors.push(`${uid}: ${r.errText}`);
          }
        } catch (e) {
          stats.pushFailed++;
          stats.errors.push(`${uid}: ${(e as Error).message}`);
        }
      }
      if (deadTokens.length) {
        try {
          await patchDoc(saToken, users/${uid}, { fcmTokens: tokens.filter((t) => !deadTokens.includes(t)) });
        } catch (e) {
          stats.errors.push(`${uid} token cleanup: ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    stats.errors.push(`fatal: ${(e as Error).message}`);
    return new Response(JSON.stringify(stats), { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  }

  return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
});
EOF
