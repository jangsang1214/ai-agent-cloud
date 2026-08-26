from tools.terminal import run

def test_dangerous_command_blocked():
    result = run("DROP DATABASE production")
    assert result.returncode == 126
    assert "BLOCKED" in result.stderr
