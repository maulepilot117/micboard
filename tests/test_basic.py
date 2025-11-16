"""Basic tests to verify test infrastructure."""
import pytest


def test_basic_math():
    """Test that pytest is working."""
    assert 1 + 1 == 2


def test_imports():
    """Test that we can import Python standard library."""
    import json
    import sys

    assert json is not None
    assert sys is not None


def test_tornado_import():
    """Test that tornado dependency is available."""
    try:
        import tornado
        assert tornado is not None
    except ImportError:
        pytest.skip("Tornado not installed")
