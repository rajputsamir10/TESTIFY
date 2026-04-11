"""
Code execution engine for Testify.
Uses OnlineCompiler.io REST API (sync endpoint) for all language execution.
Docs: https://onlinecompiler.io/docs

Supported languages: Python, JavaScript (Deno), Java, C, C++
HTML/CSS: browser-rendered on frontend only; never sent to this module.

Important API limits:
- Output truncated at 999 characters by the API (hard limit)
- Sync endpoint: max 4 concurrent requests (returns HTTP 429 when busy)
- Max execution timeout: 30 seconds per call
"""

import logging
import time
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 3
MAX_CODE_LENGTH = 100000
MAX_IO_LENGTH = 100000
MAX_TEST_CASES = 20

ONLINECOMPILER_COMPILERS = {
    "python": "python-3.14",
    "javascript": "typescript-deno",
    "java": "openjdk-25",
    "c": "gcc-15",
    "cpp": "g++-15",
}

EXIT_CODE_MEANINGS = {
    0: "success",
    1: "runtime error",
    2: "invalid arguments",
    124: "timeout",
    137: "memory limit exceeded or timeout (SIGKILL)",
    139: "segmentation fault (SIGSEGV)",
}

FORBIDDEN_PATTERNS = {
    "python": [
        "import os",
        "import sys",
        "import subprocess",
        "import socket",
        "from os",
        "from sys",
        "from subprocess",
        "open(",
        "exec(",
        "eval(",
        "__import__(",
        "compile(",
        "ctypes",
    ],
    "javascript": [
        "deno.run(",
        "deno.open(",
        "deno.connect(",
        "eval(",
        "function(",
    ],
    "java": [
        "Runtime.getRuntime",
        "ProcessBuilder",
        "System.exit",
        "java.io.File",
        "java.net.",
    ],
    "c": ["system(", "popen(", "fork("],
    "cpp": ["system(", "popen(", "fork("],
}

MAX_429_RETRIES = 3
RETRY_DELAY_SECONDS = 2


def validate_source(code: str, language: str) -> str:
    source = (code or "").strip()
    if not source:
        raise ValidationError({"code_answer": "Code cannot be empty."})
    if len(source) > MAX_CODE_LENGTH:
        raise ValidationError(
            {"code_answer": f"Code exceeds {MAX_CODE_LENGTH // 1000}KB limit."}
        )

    patterns = FORBIDDEN_PATTERNS.get(language, [])
    lowered = source.lower()
    for pattern in patterns:
        if pattern.lower() in lowered:
            raise ValidationError(
                {"code_answer": f"Restricted operation detected: {pattern}"}
            )
    return source


def sanitize_test_cases(raw: list, limit: int = MAX_TEST_CASES) -> list:
    if not isinstance(raw, list):
        return []

    result = []
    for case in raw[:limit]:
        if not isinstance(case, dict):
            continue
        result.append(
            {
                "input": str(case.get("input", ""))[:MAX_IO_LENGTH],
                "output": str(case.get("output", ""))[:MAX_IO_LENGTH],
            }
        )
    return result


def _get_headers() -> dict:
    return {
        "Authorization": settings.ONLINECOMPILER_API_KEY,
        "Content-Type": "application/json",
    }


def _call_sync_api(compiler: str, source_code: str, stdin: str) -> dict:
    api_key = getattr(settings, "ONLINECOMPILER_API_KEY", "")
    if not api_key:
        raise ValidationError(
            {
                "detail": (
                    "Code execution is not configured. "
                    "Set ONLINECOMPILER_API_KEY in environment variables."
                )
            }
        )

    base_url = getattr(settings, "ONLINECOMPILER_API_URL", "https://api.onlinecompiler.io")
    url = f"{base_url}/api/run-code-sync/"
    headers = _get_headers()
    payload = {
        "compiler": compiler,
        "code": source_code,
        "input": stdin or "",
    }

    for attempt in range(MAX_429_RETRIES + 1):
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=35,
            )
        except requests.exceptions.Timeout:
            return {
                "ok": False,
                "stdout": "",
                "stderr": "",
                "error": "API request timed out after 35 seconds.",
                "exit_code": 124,
            }
        except requests.exceptions.ConnectionError:
            return {
                "ok": False,
                "stdout": "",
                "stderr": "",
                "error": "Unable to reach OnlineCompiler.io API. Check network.",
                "exit_code": 1,
            }

        if response.status_code == 429:
            if attempt < MAX_429_RETRIES:
                logger.warning(
                    "OnlineCompiler.io 429; retry %d/%d after %ds",
                    attempt + 1,
                    MAX_429_RETRIES,
                    RETRY_DELAY_SECONDS,
                )
                time.sleep(RETRY_DELAY_SECONDS)
                continue
            return {
                "ok": False,
                "stdout": "",
                "stderr": "",
                "error": "Execution service is busy. Please try again in a moment.",
                "exit_code": 1,
            }

        if response.status_code == 401:
            logger.error("OnlineCompiler.io API key is invalid.")
            raise ValidationError(
                {"detail": "Code execution API key is invalid. Contact administrator."}
            )

        if response.status_code == 400:
            logger.error("OnlineCompiler.io bad request: %s", response.text)
            return {
                "ok": False,
                "stdout": "",
                "stderr": response.text[:500],
                "error": "Bad request sent to execution API.",
                "exit_code": 2,
            }

        if response.status_code != 200:
            return {
                "ok": False,
                "stdout": "",
                "stderr": "",
                "error": f"Execution API returned HTTP {response.status_code}.",
                "exit_code": 1,
            }

        try:
            data = response.json()
        except ValueError:
            return {
                "ok": False,
                "stdout": "",
                "stderr": "",
                "error": "Invalid JSON from execution API.",
                "exit_code": 1,
            }

        stdout = (data.get("output") or "")[:MAX_IO_LENGTH]
        stderr = (data.get("error") or "")[:MAX_IO_LENGTH]
        status = data.get("status", "error")
        exit_code = data.get("exit_code", 1)
        signal = data.get("signal")

        ok = status == "success" and exit_code == 0 and signal is None

        if not ok and not stderr:
            if signal is not None:
                stderr = f"Process killed by signal {signal} (exit code {exit_code})"
            else:
                stderr = EXIT_CODE_MEANINGS.get(
                    exit_code,
                    f"Process exited with code {exit_code}",
                )

        return {
            "ok": ok,
            "stdout": stdout,
            "stderr": stderr,
            "error": "" if ok else (stderr or "Execution failed"),
            "exit_code": exit_code,
        }

    return {
        "ok": False,
        "stdout": "",
        "stderr": "",
        "error": "Execution service unavailable after retries.",
        "exit_code": 1,
    }


def execute_code(
    language: str,
    source: str,
    test_cases: list,
    timeout: int = DEFAULT_TIMEOUT,
    memory_limit_mb: int = 256,
) -> dict:
    """Run source code against test cases using OnlineCompiler sync API."""
    _ = timeout
    _ = memory_limit_mb

    if language == "html":
        raise ValidationError(
            {"detail": "HTML/CSS questions are browser-rendered. No server execution."}
        )

    compiler = ONLINECOMPILER_COMPILERS.get(language)
    if not compiler:
        raise ValidationError(
            {"detail": f'Language "{language}" is not supported for execution.'}
        )

    validated_source = validate_source(source, language)
    cases = sanitize_test_cases(test_cases)

    if not cases:
        raise ValidationError(
            {"detail": "No valid test cases configured for this question."}
        )

    case_results = []
    passed_count = 0

    for idx, case in enumerate(cases, start=1):
        run = _call_sync_api(compiler, validated_source, case["input"])

        actual = (run["stdout"] or "").strip()
        expected = (case["output"] or "").strip()
        is_pass = run["ok"] and actual == expected

        if is_pass:
            passed_count += 1

        case_results.append(
            {
                "index": idx,
                "input": case["input"],
                "expected_output": expected,
                "actual_output": actual,
                "passed": is_pass,
                "error": run.get("error", ""),
                "stderr": run.get("stderr", ""),
                "exit_code": run.get("exit_code", 0),
            }
        )

    total = len(cases)
    ratio = Decimal(passed_count) / Decimal(total)

    return {
        "language": language,
        "passed_count": passed_count,
        "total_cases": total,
        "ratio": str(ratio),
        "case_results": case_results,
    }


def score_from_execution_result(result: dict, question_marks: Decimal) -> Decimal:
    """Proportional scoring: (passed / total) * marks, rounded to 2 decimals."""
    ratio = Decimal(str(result.get("ratio", "0")))
    return (question_marks * ratio).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
