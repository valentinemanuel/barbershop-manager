"""Sobre canónico puro de cortes.

Incrementos T90–T94: sobre y árbol original con UUID, Decimal e instantes
aware explícitos y hash SHA256 determinista, no autorización.
No usar este incremento parcial como frontera productiva v3.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from hashlib import sha256
import json
from typing import Literal, TypeAlias
from uuid import UUID


class Ausente(Enum):
    """Omisión distinta de null, limitada a los opcionales comunes."""

    VALOR = 'ausente'


AUSENTE = Ausente.VALOR
NAMESPACE_CORTES = 'cortes:v3'

ValorEntrada: TypeAlias = (
    None | bool | int | str | Decimal | UUID | datetime
    | list['ValorEntrada'] | dict[str, 'ValorEntrada']
)


@dataclass(frozen=True, kw_only=True)
class ReferenciaUuidCreacion:
    uuid: UUID


@dataclass(frozen=True, kw_only=True)
class ReferenciaIdServidor:
    id: int


ReferenciaCorte: TypeAlias = ReferenciaUuidCreacion | ReferenciaIdServidor


@dataclass(frozen=True, kw_only=True)
class ComandoCorte:
    version: Literal[3]
    operacion_uuid: UUID
    accion: str
    modo_captura: Literal['online', 'offline']
    instante_cambio: datetime
    referencia_corte: ReferenciaCorte
    datos: dict[str, ValorEntrada]
    depende_de_operacion_uuid: UUID | None | Ausente = AUSENTE
    momento_real: datetime | None | Ausente = AUSENTE
    id_servidor_hint: int | None | Ausente = AUSENTE


@dataclass(frozen=True, kw_only=True)
class ComandoCanonico:
    json_canonico: str


def _validar_tipo(valor: object, tipo: type) -> None:
    if type(valor) is not tipo:
        raise TypeError('Tipo de comando no admitido')


def _validar_id(valor: int) -> None:
    _validar_tipo(valor, int)
    if valor <= 0:
        raise ValueError('Entrada de comando inválida')


def _representar_instante(valor: datetime) -> str:
    """UTC con seis decimales y año de cuatro dígitos; sin política temporal."""
    _validar_tipo(valor, datetime)
    try:
        if valor.utcoffset() is None:
            raise ValueError
        utc = valor.astimezone(timezone.utc)
        return utc.isoformat(timespec='microseconds').replace('+00:00', 'Z')
    except Exception:
        raise ValueError('Entrada de comando inválida') from None


def _representar_decimal(valor: Decimal) -> str:
    """Centavos por dígitos, sin aritmética Decimal ni contexto de trabajo."""
    representacion = valor.as_tuple()
    exponente = representacion.exponent
    if not isinstance(exponente, int) or exponente < -2:
        raise ValueError('Entrada de comando inválida')
    if not any(representacion.digits):
        return '0.00'
    digitos = ''.join(str(digito) for digito in representacion.digits)
    centavos = digitos + '0' * (exponente + 2)
    centavos = centavos.zfill(3)
    signo = '-' if representacion.sign else ''
    return signo + centavos[:-2] + '.' + centavos[-2:]


def _copiar_arbol(valor: ValorEntrada, activos: set[int]) -> ValorEntrada:
    """Copia lógica nueva; detecta ciclos solo en la rama activa, no en hermanos."""
    tipo = type(valor)
    if valor is None or tipo in (bool, int, str):
        return valor
    if tipo is UUID:
        return str(valor)
    if tipo is Decimal:
        return _representar_decimal(valor)
    if tipo is datetime:
        return _representar_instante(valor)
    if tipo not in (dict, list):
        raise TypeError('Tipo de comando no admitido')

    identidad = id(valor)
    if identidad in activos:
        raise ValueError('Entrada de comando inválida')
    activos.add(identidad)
    try:
        if tipo is list:
            return [_copiar_arbol(elemento, activos) for elemento in valor]
        copia: dict[str, ValorEntrada] = {}
        for clave, elemento in valor.items():
            _validar_tipo(clave, str)
            copia[clave] = _copiar_arbol(elemento, activos)
        return copia
    finally:
        activos.remove(identidad)


def canonizar_comando(entrada: ComandoCorte, actor_id: int) -> ComandoCanonico:
    """Canoniza la entrada original sin defaults, heurísticas ni alias mutables."""
    _validar_tipo(entrada, ComandoCorte)
    _validar_id(actor_id)
    _validar_tipo(entrada.version, int)
    _validar_tipo(entrada.accion, str)
    _validar_tipo(entrada.modo_captura, str)
    if (entrada.version != 3 or not entrada.accion
            or entrada.modo_captura not in ('online', 'offline')):
        raise ValueError('Entrada de comando inválida')
    _validar_tipo(entrada.operacion_uuid, UUID)

    referencia = entrada.referencia_corte
    referencia_json: dict[str, ValorEntrada]
    if type(referencia) is ReferenciaUuidCreacion:
        _validar_tipo(referencia.uuid, UUID)
        referencia_json = {'tipo': 'uuid_creacion', 'uuid': str(referencia.uuid)}
    elif type(referencia) is ReferenciaIdServidor:
        _validar_id(referencia.id)
        referencia_json = {'tipo': 'id_servidor', 'id': referencia.id}
    else:
        raise TypeError('Tipo de comando no admitido')

    padre = entrada.depende_de_operacion_uuid
    if padre is not AUSENTE and padre is not None:
        _validar_tipo(padre, UUID)
    hint = entrada.id_servidor_hint
    if hint is not AUSENTE and hint is not None:
        _validar_id(hint)
    instante = _representar_instante(entrada.instante_cambio)
    momento = entrada.momento_real
    momento_json = None
    if momento is not AUSENTE and momento is not None:
        momento_json = _representar_instante(momento)

    _validar_tipo(entrada.datos, dict)
    try:
        datos_json = _copiar_arbol(entrada.datos, set())
    except RecursionError:
        # Límite técnico del runtime, no un máximo nuevo de profundidad/nodos.
        raise ValueError('Entrada de comando inválida') from None

    objeto: dict[str, ValorEntrada] = {
        'namespace': NAMESPACE_CORTES, 'actor_id': actor_id,
        'version': entrada.version, 'operacion_uuid': str(entrada.operacion_uuid),
        'accion': entrada.accion, 'modo_captura': entrada.modo_captura,
        'instante_cambio': instante, 'referencia_corte': referencia_json, 'datos': datos_json,
    }
    if padre is not AUSENTE:
        objeto['depende_de_operacion_uuid'] = None if padre is None else str(padre)
    if momento is not AUSENTE:
        objeto['momento_real'] = momento_json
    try:
        texto = json.dumps(
            objeto, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False,
        )
    except (RecursionError, ValueError):
        raise ValueError('Entrada de comando inválida') from None
    return ComandoCanonico(json_canonico=texto)


def firmar_comando(comando: ComandoCanonico) -> str:
    """Hash del texto recibido; no recanoniza ni certifica autoridad o contenido."""
    _validar_tipo(comando, ComandoCanonico)
    _validar_tipo(comando.json_canonico, str)
    try:
        contenido = comando.json_canonico.encode('utf-8')
    except UnicodeEncodeError:
        raise ValueError('Entrada de comando inválida') from None
    return sha256(contenido).hexdigest()
