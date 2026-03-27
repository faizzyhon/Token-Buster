from setuptools import setup, find_packages

setup(
    name="token-buster",
    version="1.0.0",
    description="AI Token Optimizer — Reduce token usage by 5x-10x",
    author="Muhammad Faizan",
    author_email="faizzyhon@gmail.com",
    url="https://github.com/faizzyhon",
    packages=find_packages(),
    python_requires=">=3.10",
    install_requires=[
        "flask>=3.0.0",
        "flask-cors>=4.0.0",
        "tiktoken>=0.6.0",
        "watchdog>=4.0.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "token-buster=main:main",
        ]
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
