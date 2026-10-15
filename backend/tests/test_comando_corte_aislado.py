"""T90–T94: canonización e identidad puras, sin integración de aplicación."""

from dataclasses import FrozenInstanceError, fields, replace
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone, tzinfo
from decimal import Decimal, MAX_EMAX, ROUND_DOWN, ROUND_UP, getcontext, localcontext
from enum import Enum, IntEnum
import json
from hashlib import sha256
import re
from uuid import UUID

import pytest

from app.services.comando_corte import (
    AUSENTE,
    NAMESPACE_CORTES,
    Ausente,
    ComandoCanonico,
    ComandoCorte,
    ReferenciaIdServidor,
    ReferenciaUuidCreacion,
    canonizar_comando,
    firmar_comando,
)


OPERACION = UUID('ABCDEF00-0000-0000-0000-000000000001')
CORTE = UUID('ABCDEF00-0000-0000-0000-000000000002')
PADRE = UUID('ABCDEF00-0000-0000-0000-000000000003')
INSTANTE = datetime(2026, 10, 9, 12, 30, 1, 123456, tzinfo=timezone.utc)


@pytest.fixture
def entrada() -> ComandoCorte:
    return ComandoCorte(
        version=3, operacion_uuid=OPERACION, accion=' crear ',
        modo_captura='online', instante_cambio=INSTANTE,
        referencia_corte=ReferenciaUuidCreacion(uuid=CORTE), datos={},
    )


def test_json_exacto_y_entrada_intacta(entrada: ComandoCorte) -> None:
    salida = canonizar_comando(entrada, 7)
    assert type(salida) is ComandoCanonico
    assert NAMESPACE_CORTES == 'cortes:v3'
    assert salida.json_canonico == (
        '{"accion":" crear ","actor_id":7,"datos":{},'
        '"instante_cambio":"2026-10-09T12:30:01.123456Z",'
        '"modo_captura":"online","namespace":"cortes:v3",'
        '"operacion_uuid":"abcdef00-0000-0000-0000-000000000001",'
        '"referencia_corte":{"tipo":"uuid_creacion",'
        '"uuid":"abcdef00-0000-0000-0000-000000000002"},"version":3}'
    )
    assert entrada.datos == {}
    assert entrada.operacion_uuid is OPERACION
    assert entrada.referencia_corte.uuid is CORTE
    assert entrada.instante_cambio is INSTANTE
    assert entrada.accion == ' crear '
    assert entrada.depende_de_operacion_uuid is AUSENTE
    assert entrada.momento_real is AUSENTE
    assert entrada.id_servidor_hint is AUSENTE


@pytest.mark.parametrize('modo', ['online', 'offline'])
def test_modos_y_referencia_id(entrada: ComandoCorte, modo: str) -> None:
    comando = replace(entrada, modo_captura=modo, referencia_corte=ReferenciaIdServidor(id=42))
    objeto = json.loads(canonizar_comando(comando, 7).json_canonico)
    assert objeto['modo_captura'] == modo
    assert objeto['referencia_corte'] == {'tipo': 'id_servidor', 'id': 42}
    assert canonizar_comando(comando, 7) != canonizar_comando(entrada, 7)


@pytest.mark.parametrize('campo', ['depende_de_operacion_uuid', 'momento_real'])
def test_omision_distinta_de_null(entrada: ComandoCorte, campo: str) -> None:
    omitido = canonizar_comando(entrada, 7)
    explicito = canonizar_comando(replace(entrada, **{campo: None}), 7)
    assert campo not in json.loads(omitido.json_canonico)
    assert json.loads(explicito.json_canonico)[campo] is None
    assert omitido != explicito


def test_identidades_en_posiciones_distintas_y_momento_utc(entrada: ComandoCorte) -> None:
    momento = datetime(2026, 10, 8, tzinfo=timezone.utc)
    comando = replace(entrada, depende_de_operacion_uuid=PADRE, momento_real=momento)
    objeto = json.loads(canonizar_comando(comando, 7).json_canonico)
    assert objeto['operacion_uuid'] == str(OPERACION)
    assert objeto['referencia_corte']['uuid'] == str(CORTE)
    assert objeto['depende_de_operacion_uuid'] == str(PADRE)
    assert objeto['momento_real'] == '2026-10-08T00:00:00.000000Z'
    assert comando.depende_de_operacion_uuid is PADRE
    assert comando.momento_real is momento


def test_no_exige_desigualdad_ni_version_uuid(entrada: ComandoCorte) -> None:
    nulo = UUID(int=0)
    comando = replace(entrada, operacion_uuid=nulo,
                      referencia_corte=ReferenciaUuidCreacion(uuid=nulo),
                      depende_de_operacion_uuid=nulo)
    objeto = json.loads(canonizar_comando(comando, 1).json_canonico)
    assert objeto['operacion_uuid'] == objeto['referencia_corte']['uuid']
    assert objeto['depende_de_operacion_uuid'] == str(nulo)


@pytest.mark.parametrize('hint', [AUSENTE, None, 1, 999])
def test_hint_metadata_no_autoridad(entrada: ComandoCorte, hint: object) -> None:
    comando = replace(entrada, id_servidor_hint=hint)
    assert canonizar_comando(comando, 7) == canonizar_comando(entrada, 7)
    assert comando.id_servidor_hint is hint
    assert 'id_servidor_hint' not in json.loads(canonizar_comando(comando, 7).json_canonico)


@pytest.mark.parametrize('clase,nombres', [
    (ReferenciaUuidCreacion, ['uuid']), (ReferenciaIdServidor, ['id']),
    (ComandoCanonico, ['json_canonico']),
    (ComandoCorte, ['version', 'operacion_uuid', 'accion', 'modo_captura',
                    'instante_cambio', 'referencia_corte', 'datos',
                    'depende_de_operacion_uuid', 'momento_real', 'id_servidor_hint']),
])
def test_campos_frozen_kw_only(clase: type, nombres: list[str]) -> None:
    assert [campo.name for campo in fields(clase)] == nombres
    assert all(campo.kw_only for campo in fields(clase))
    assert clase.__dataclass_params__.frozen


def test_inmutabilidad_y_marcador(entrada: ComandoCorte) -> None:
    assert issubclass(Ausente, Enum)
    assert list(Ausente) == [AUSENTE]
    assert AUSENTE is Ausente.VALOR
    salida = canonizar_comando(entrada, 7)
    for objeto, campo in [(entrada, 'accion'), (entrada.referencia_corte, 'uuid'),
                          (ReferenciaIdServidor(id=1), 'id'), (salida, 'json_canonico')]:
        with pytest.raises(FrozenInstanceError):
            setattr(objeto, campo, None)
    with pytest.raises(TypeError):
        ReferenciaIdServidor(1)
    with pytest.raises(TypeError):
        replace(entrada, actor_id=7)


@pytest.mark.parametrize('actor,error', [
    (True, TypeError), (False, TypeError), ('7', TypeError), (None, TypeError),
    (0, ValueError), (-1, ValueError),
])
def test_actor_estricto(entrada: ComandoCorte, actor: object, error: type[Exception]) -> None:
    mensaje = 'Tipo de comando no admitido' if error is TypeError else 'Entrada de comando inválida'
    with pytest.raises(error, match=f'^{mensaje}$'):
        canonizar_comando(entrada, actor)


@pytest.mark.parametrize('campo,valor,error', [
    ('version', True, TypeError), ('version', '3', TypeError),
    ('version', 3.0, TypeError), ('version', 2, ValueError),
    ('accion', None, TypeError), ('accion', 1, TypeError), ('accion', '', ValueError),
    ('modo_captura', None, TypeError), ('modo_captura', True, TypeError),
    ('modo_captura', 'ONLINE', ValueError), ('modo_captura', ' offline ', ValueError),
    ('operacion_uuid', str(OPERACION), TypeError), ('operacion_uuid', None, TypeError),
    ('referencia_corte', {'tipo': 'id_servidor', 'id': 1}, TypeError),
    ('referencia_corte', None, TypeError),
    ('referencia_corte', ReferenciaUuidCreacion(uuid=str(CORTE)), TypeError),
    ('referencia_corte', ReferenciaIdServidor(id=True), TypeError),
    ('referencia_corte', ReferenciaIdServidor(id='1'), TypeError),
    ('referencia_corte', ReferenciaIdServidor(id=0), ValueError),
    ('referencia_corte', ReferenciaIdServidor(id=-1), ValueError),
    ('depende_de_operacion_uuid', str(PADRE), TypeError),
    ('depende_de_operacion_uuid', 1, TypeError),
    ('momento_real', '2026-10-09', TypeError), ('momento_real', True, TypeError),
    ('instante_cambio', None, TypeError), ('instante_cambio', AUSENTE, TypeError),
    ('id_servidor_hint', True, TypeError), ('id_servidor_hint', '1', TypeError),
    ('id_servidor_hint', 0, ValueError), ('id_servidor_hint', -1, ValueError),
    ('datos', [], TypeError), ('datos', None, TypeError),
])
def test_comunes_invalidos_seguro(entrada: ComandoCorte, campo: str,
                                 valor: object, error: type[Exception]) -> None:
    mensaje = 'Tipo de comando no admitido' if error is TypeError else 'Entrada de comando inválida'
    with pytest.raises(error, match=f'^{mensaje}$') as captura:
        canonizar_comando(replace(entrada, **{campo: valor}), 7)
    assert captura.value.__cause__ is None


@pytest.mark.parametrize('raiz', [{}, None, 'entrada confidencial', AUSENTE])
def test_root_no_parser(raiz: object) -> None:
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        canonizar_comando(raiz, 7)


def test_root_y_escalares_exactos(entrada: ComandoCorte) -> None:
    class ComandoDerivado(ComandoCorte):
        pass

    class EnteroDerivado(int):
        pass

    class CadenaDerivada(str):
        pass

    derivado = ComandoDerivado(
        version=3, operacion_uuid=OPERACION, accion='crear', modo_captura='online',
        instante_cambio=INSTANTE, referencia_corte=ReferenciaIdServidor(id=1), datos={},
    )
    for comando, actor in [(derivado, 7), (entrada, EnteroDerivado(7)),
                           (replace(entrada, modo_captura=CadenaDerivada('online')), 7)]:
        with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
            canonizar_comando(comando, actor)


def test_datos_no_vacios_conservados_desde_t91(entrada: ComandoCorte) -> None:
    # T91 reemplaza el guard TEMPORAL de T90; su evidencia histórica no cambia.
    datos = {'metodo': 'efectivo'}
    salida = canonizar_comando(replace(entrada, datos=datos), 7)
    assert json.loads(salida.json_canonico)['datos'] == datos
    assert datos == {'metodo': 'efectivo'}


def test_arbol_json_exacto_sin_normalizacion_ni_mutacion(entrada: ComandoCorte) -> None:
    datos = {'z': [None, True, False, 0, -12, '001', '1.00'],
             'a': {'uuid': 'ABCDEF00-0000-0000-0000-000000000001',
                   'iso': '2026-10-09T09:30:01.123456-03:00',
                   'texto': '  café e\u0301 😀\n"\\  ', 'vacio': ''}}
    original = deepcopy(datos)
    salida = canonizar_comando(replace(entrada, datos=datos), 7)
    assert '"datos":{"a":{"iso":"2026-10-09T09:30:01.123456-03:00",' in salida.json_canonico
    assert '"texto":"  caf\\u00e9 e\\u0301 \\ud83d\\ude00\\n\\"\\\\  "' in salida.json_canonico
    assert '"z":[null,true,false,0,-12,"001","1.00"]' in salida.json_canonico
    assert json.loads(salida.json_canonico)['datos'] == original
    assert salida.json_canonico == json.dumps(json.loads(salida.json_canonico),
        sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)
    assert not salida.json_canonico.endswith('\n')
    assert datos == original
    datos['a']['texto'] = 'cambiado'
    datos['z'].append({'nuevo': 1})
    assert json.loads(salida.json_canonico)['datos'] == original
    with pytest.raises(FrozenInstanceError):
        salida.json_canonico = 'otro'


def test_orden_dict_recursivo_y_listas_significativas(entrada: ComandoCorte) -> None:
    primero = {'z': [{'b': 2, 'a': 1}, 3], 'a': {'y': 4, 'x': 5}}
    segundo = {'a': {'x': 5, 'y': 4}, 'z': [{'a': 1, 'b': 2}, 3]}
    uno = canonizar_comando(replace(entrada, datos=primero), 7)
    assert uno == canonizar_comando(replace(entrada, datos=segundo), 7)
    segundo['z'].reverse()
    assert uno != canonizar_comando(replace(entrada, datos=segundo), 7)


def test_datos_omision_null_sin_defaults(entrada: ComandoCorte) -> None:
    omitido = canonizar_comando(replace(entrada, datos={'cambios': {}}), 7)
    explicito = canonizar_comando(replace(entrada, datos={'cambios': {'metodo': None}}), 7)
    assert json.loads(omitido.json_canonico)['datos'] == {'cambios': {}}
    assert json.loads(explicito.json_canonico)['datos'] == {'cambios': {'metodo': None}}
    assert omitido != explicito


def test_uuid_tipado_en_arbol_conversion_explicita(entrada: ComandoCorte) -> None:
    datos = {'refs': [CORTE, UUID(int=0)]}
    salida = canonizar_comando(replace(entrada, datos=datos), 7)
    assert json.loads(salida.json_canonico)['datos'] == {'refs': [str(CORTE), str(UUID(int=0))]}
    assert datos['refs'][0] is CORTE


class EnteroArbol(int):
    pass


class CadenaArbol(str):
    pass


class ListaArbol(list):
    pass


class DictArbol(dict):
    pass


class NumeroEnum(IntEnum):
    UNO = 1


class CadenaEnum(str, Enum):
    TEXTO = 'confidencial'


@pytest.mark.parametrize('valor', [
    1.25, float('nan'), float('inf'), float('-inf'), AUSENTE,
    (1, 2), {1, 2}, frozenset({1}), b'confidencial', bytearray(b'secreto'),
    date(2026, 10, 9), object(), EnteroArbol(1), CadenaArbol('secreto'),
    ListaArbol([1]), DictArbol({'x': 1}), NumeroEnum.UNO, CadenaEnum.TEXTO,
])
@pytest.mark.parametrize('envolver', ['directo', 'dict', 'lista'])
def test_tipos_arbol_rechazados_recursivamente(entrada: ComandoCorte, valor: object,
                                             envolver: str) -> None:
    anidado = valor if envolver == 'directo' else ({'secreto': valor} if envolver == 'dict' else [valor])
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$') as captura:
        canonizar_comando(replace(entrada, datos={'campo': anidado}), 7)
    assert captura.value.__cause__ is None
    assert captura.value.__context__ is None


@pytest.mark.parametrize('clave', [1, True, None, CORTE, CadenaArbol('secreto'), CadenaEnum.TEXTO])
def test_keys_estrictamente_string(entrada: ComandoCorte, clave: object) -> None:
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        canonizar_comando(replace(entrada, datos={'lista': [{clave: 'confidencial'}]}), 7)


@pytest.mark.parametrize('tipo_ciclo', ['dict', 'lista', 'mixto'])
def test_ciclos_activos_rechazados_sin_mutar(entrada: ComandoCorte, tipo_ciclo: str) -> None:
    datos: dict[str, object] = {}
    if tipo_ciclo == 'dict':
        datos['secreto'] = datos
    elif tipo_ciclo == 'lista':
        lista: list[object] = []
        lista.append(lista)
        datos['secreto'] = lista
    else:
        datos['secreto'] = [datos]
    enlace = datos['secreto']
    with pytest.raises(ValueError, match='^Entrada de comando inválida$') as captura:
        canonizar_comando(replace(entrada, datos=datos), 7)
    assert captura.value.__cause__ is None
    assert captura.value.__context__ is None
    assert datos['secreto'] is enlace


def test_colecciones_compartidas_no_son_ciclos(entrada: ComandoCorte) -> None:
    compartido = {'lista': [1, {'x': 'literal'}]}
    datos = {'a': compartido, 'b': [compartido, compartido['lista']]}
    original = deepcopy(datos)
    salida = canonizar_comando(replace(entrada, datos=datos), 7)
    assert json.loads(salida.json_canonico)['datos'] == original
    assert datos['a'] is datos['b'][0]
    assert datos['a']['lista'] is datos['b'][1]
    compartido['lista'].append(2)
    assert json.loads(salida.json_canonico)['datos'] == original


@pytest.mark.parametrize('texto,esperado', [
    ('1', '1.00'), ('1.0', '1.00'), ('1.00', '1.00'), ('1E+2', '100.00'),
    ('-12.30', '-12.30'), ('-0.01', '-0.01'), ('0', '0.00'), ('-0', '0.00'),
    ('0.00', '0.00'), ('-0.00', '0.00'), ('-0E+100', '0.00'),
    ('1000000000000.01', '1000000000000.01'),
    ('-1000000000000.01', '-1000000000000.01'),
    ('1E+100', '1' + '0' * 100 + '.00'),
    ('9' * 5000 + '.01', '9' * 5000 + '.01'),
    ('0E+' + str(MAX_EMAX), '0.00'),
])
def test_decimal_exacto_recursivo_sin_mutacion(entrada: ComandoCorte,
                                             texto: str, esperado: str) -> None:
    valor = Decimal(texto)
    original = valor.as_tuple()
    datos = {'importe': valor, 'lista': [{'correctivo': valor}]}
    salida = canonizar_comando(replace(entrada, datos=datos), 7)
    assert json.loads(salida.json_canonico)['datos'] == {
        'importe': esperado, 'lista': [{'correctivo': esperado}]}
    assert datos['importe'] is valor
    assert datos['lista'][0]['correctivo'] is valor
    assert valor.as_tuple() == original
    assert canonizar_comando(replace(entrada, datos={'importe': valor}), 7) == (
        canonizar_comando(replace(entrada, datos={'importe': esperado}), 7))


@pytest.mark.parametrize('texto', [
    '1.000', '0.001', '-0.001', '0.000', '-0.000', '100.000',
    'NaN', '-NaN123', 'sNaN', '-sNaN456', 'Infinity', '-Infinity',
])
@pytest.mark.parametrize('envolver', ['directo', 'dict', 'lista'])
def test_decimal_invalido_error_generico(entrada: ComandoCorte,
                                         texto: str, envolver: str) -> None:
    valor = Decimal(texto)
    original = valor.as_tuple()
    anidado = valor if envolver == 'directo' else ({'x': valor} if envolver == 'dict' else [valor])
    with pytest.raises(ValueError, match='^Entrada de comando inválida$') as captura:
        canonizar_comando(replace(entrada, datos={'importe': anidado}), 7)
    assert captura.value.__cause__ is None
    assert captura.value.__context__ is None
    assert valor.as_tuple() == original


def _estado_contexto_decimal() -> tuple[object, ...]:
    contexto = getcontext()
    return (contexto.prec, contexto.rounding, contexto.Emin, contexto.Emax,
            contexto.capitals, contexto.clamp, dict(contexto.traps), dict(contexto.flags))


@pytest.mark.parametrize('texto,esperado', [
    ('1000000000000.01', '1000000000000.01'), ('-12.30', '-12.30'),
    ('-0.00', '0.00'), ('1E+100', '1' + '0' * 100 + '.00'),
    ('sNaN123', None), ('NaN', None), ('Infinity', None), ('1.000', None),
])
@pytest.mark.parametrize('rounding', [ROUND_DOWN, ROUND_UP])
@pytest.mark.parametrize('activar', [False, True])
def test_decimal_contexto_completo_intacto(entrada: ComandoCorte, texto: str,
                                           esperado: str | None, rounding: str,
                                           activar: bool) -> None:
    valor = Decimal(texto)
    original = valor.as_tuple()
    with localcontext() as contexto:
        contexto.prec = 1
        contexto.rounding = rounding
        contexto.Emin = -2
        contexto.Emax = 2
        contexto.capitals = 0
        contexto.clamp = 1
        for indice, senal in enumerate(contexto.flags):
            contexto.traps[senal] = activar
            contexto.flags[senal] = bool(indice % 2) != activar
        antes = _estado_contexto_decimal()
        if esperado is None:
            with pytest.raises(ValueError, match='^Entrada de comando inválida$'):
                canonizar_comando(replace(entrada, datos={'x': [valor]}), 7)
        else:
            salida = canonizar_comando(replace(entrada, datos={'x': [valor]}), 7)
            assert json.loads(salida.json_canonico)['datos'] == {'x': [esperado]}
        assert getcontext() is contexto
        assert _estado_contexto_decimal() == antes
        assert valor.as_tuple() == original


def test_subclase_decimal_no_coercion(entrada: ComandoCorte) -> None:
    class DecimalDerivado(Decimal):
        pass

    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        canonizar_comando(replace(entrada, datos={'x': DecimalDerivado('1.00')}), 7)


def _ubicar_instante(entrada: ComandoCorte, posicion: str, valor: object) -> ComandoCorte:
    if posicion in ('instante_cambio', 'momento_real'):
        return replace(entrada, **{posicion: valor})
    return replace(entrada, datos={'fecha': valor if posicion == 'datos' else [{'x': valor}]})


def _leer_instante(comando: ComandoCorte, posicion: str) -> object:
    objeto = json.loads(canonizar_comando(comando, 7).json_canonico)
    if posicion in ('instante_cambio', 'momento_real'):
        return objeto[posicion]
    valor = objeto['datos']['fecha']
    return valor if posicion == 'datos' else valor[0]['x']


@pytest.mark.parametrize('posicion', ['instante_cambio', 'momento_real', 'datos', 'anidado'])
@pytest.mark.parametrize('utc,esperado', [
    (datetime(2026, 1, 1, 0, 0, 0, 123456, tzinfo=timezone.utc), '2026-01-01T00:00:00.123456Z'),
    (datetime(2026, 12, 31, 23, 59, 59, 999999, tzinfo=timezone.utc), '2026-12-31T23:59:59.999999Z'),
    (datetime(2026, 10, 9, tzinfo=timezone.utc), '2026-10-09T00:00:00.000000Z'),
    (datetime(1, 1, 2, tzinfo=timezone.utc), '0001-01-02T00:00:00.000000Z'),
    (datetime(9999, 12, 30, tzinfo=timezone.utc), '9999-12-30T00:00:00.000000Z'),
])
def test_instantes_offsets_equivalentes_precisos(entrada: ComandoCorte, posicion: str,
                                                utc: datetime, esperado: str) -> None:
    base = canonizar_comando(_ubicar_instante(entrada, posicion, utc), 7)
    for offset in (timedelta(hours=-3), timedelta(hours=5, minutes=30),
                   timedelta(seconds=30, microseconds=123456)):
        valor = utc.astimezone(timezone(offset))
        antes = (valor.isoformat(), valor.tzinfo, valor.fold, valor.microsecond)
        comando = _ubicar_instante(entrada, posicion, valor)
        assert _leer_instante(comando, posicion) == esperado
        assert canonizar_comando(comando, 7) == base
        assert (valor.isoformat(), valor.tzinfo, valor.fold, valor.microsecond) == antes
        if posicion in ('instante_cambio', 'momento_real'):
            assert getattr(comando, posicion) is valor
        else:
            if posicion == 'datos':
                assert comando.datos['fecha'] is valor
            else:
                assert comando.datos['fecha'][0]['x'] is valor


@pytest.mark.parametrize('posicion', ['instante_cambio', 'momento_real', 'datos', 'anidado'])
def test_microsegundo_distinto_cruzando_dia_utc(entrada: ComandoCorte, posicion: str) -> None:
    valor = datetime(2026, 10, 8, 21, 0, 0, 1, tzinfo=timezone(timedelta(hours=-3)))
    siguiente = valor + timedelta(microseconds=1)
    uno = _ubicar_instante(entrada, posicion, valor)
    dos = _ubicar_instante(entrada, posicion, siguiente)
    assert _leer_instante(uno, posicion) == '2026-10-09T00:00:00.000001Z'
    assert _leer_instante(dos, posicion) == '2026-10-09T00:00:00.000002Z'
    assert canonizar_comando(uno, 7) != canonizar_comando(dos, 7)
    assert valor.day == 8 and valor.microsecond == 1


class ZonaDesconocida(tzinfo):
    def utcoffset(self, dt: datetime | None) -> None:
        return None


class ZonaError(tzinfo):
    def utcoffset(self, dt: datetime | None) -> timedelta:
        raise RuntimeError('detalle confidencial de zona')


class ZonaInvalida(tzinfo):
    def utcoffset(self, dt: datetime | None) -> timedelta:
        return timedelta(days=1)


class InstanteDerivado(datetime):
    pass


@pytest.mark.parametrize('posicion', ['instante_cambio', 'momento_real', 'datos', 'anidado'])
@pytest.mark.parametrize('valor', [
    datetime(2026, 10, 9), datetime(2026, 10, 9, tzinfo=ZonaDesconocida()),
    datetime(2026, 10, 9, tzinfo=ZonaError()), datetime(2026, 10, 9, tzinfo=ZonaInvalida()),
    datetime(1, 1, 1, tzinfo=timezone(timedelta(hours=1))),
    datetime(9999, 12, 31, 23, 59, 59, 999999, tzinfo=timezone(timedelta(hours=-1))),
])
def test_instante_invalido_error_seguro(entrada: ComandoCorte, posicion: str,
                                       valor: datetime) -> None:
    antes = (valor.year, valor.month, valor.day, valor.hour, valor.minute,
             valor.second, valor.microsecond, valor.tzinfo, valor.fold)
    with pytest.raises(ValueError, match='^Entrada de comando inválida$') as captura:
        canonizar_comando(_ubicar_instante(entrada, posicion, valor), 7)
    assert captura.value.__cause__ is None
    assert captura.value.__suppress_context__
    assert (valor.year, valor.month, valor.day, valor.hour, valor.minute,
            valor.second, valor.microsecond, valor.tzinfo, valor.fold) == antes


@pytest.mark.parametrize('posicion', ['instante_cambio', 'momento_real', 'datos', 'anidado'])
@pytest.mark.parametrize('valor', [date(2026, 10, 9), InstanteDerivado(2026, 10, 9, tzinfo=timezone.utc)])
def test_fecha_y_subclase_no_son_datetime_concreto(entrada: ComandoCorte, posicion: str,
                                                 valor: object) -> None:
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        canonizar_comando(_ubicar_instante(entrada, posicion, valor), 7)


def test_datetime_y_string_solo_equivalen_si_ya_canonico(entrada: ComandoCorte) -> None:
    valor = datetime(2026, 10, 8, 21, tzinfo=timezone(timedelta(hours=-3)))
    texto = '2026-10-09T00:00:00.000000Z'
    assert canonizar_comando(replace(entrada, datos={'fecha': valor}), 7) == (
        canonizar_comando(replace(entrada, datos={'fecha': texto}), 7))
    aparente = valor.isoformat()
    salida = canonizar_comando(replace(entrada, datos={'fecha': aparente}), 7)
    assert json.loads(salida.json_canonico)['datos']['fecha'] == aparente
    assert salida != canonizar_comando(replace(entrada, datos={'fecha': valor}), 7)


def test_firma_vector_literal_independiente(entrada: ComandoCorte) -> None:
    esperado = (
        '{"accion":" crear ","actor_id":7,"datos":{"importe":"1.00","motivo":"\\u00f1"},'
        '"instante_cambio":"2026-10-09T12:30:01.123456Z",'
        '"modo_captura":"online","namespace":"cortes:v3",'
        '"operacion_uuid":"abcdef00-0000-0000-0000-000000000001",'
        '"referencia_corte":{"tipo":"uuid_creacion",'
        '"uuid":"abcdef00-0000-0000-0000-000000000002"},"version":3}'
    )
    comando = replace(entrada, datos={'motivo': 'ñ', 'importe': Decimal('1')})
    salida = canonizar_comando(comando, 7)
    assert salida.json_canonico == esperado
    firma = firmar_comando(salida)
    assert firma == sha256(esperado.encode('utf-8')).hexdigest()
    assert re.fullmatch('[0-9a-f]{64}', firma)
    assert firmar_comando(salida) == firma


@pytest.mark.parametrize('importe', [Decimal('1'), Decimal('1.0'), Decimal('1.00')])
@pytest.mark.parametrize('offset', [-3, 0, 5])
def test_firma_equivalencias_y_conservacion(entrada: ComandoCorte, importe: Decimal,
                                           offset: int) -> None:
    base = replace(entrada, momento_real=INSTANTE,
                   datos={'importe': Decimal('1'), 'lista': [2, 1], 'base': {'a': 1, 'b': None}})
    equivalente = replace(base,
        instante_cambio=INSTANTE.astimezone(timezone(timedelta(hours=offset))),
        momento_real=INSTANTE.astimezone(timezone(timedelta(hours=offset))),
        datos={'base': {'b': None, 'a': 1}, 'lista': [2, 1], 'importe': importe})
    copia = deepcopy(equivalente)
    identidad_contexto = getcontext()
    contexto = identidad_contexto.copy()
    salida = canonizar_comando(equivalente, 7)
    firma = firmar_comando(salida)
    assert salida == canonizar_comando(base, 7)
    assert firma == firmar_comando(canonizar_comando(base, 7))
    assert equivalente == copia
    assert importe.as_tuple() == copia.datos['importe'].as_tuple()
    assert getcontext() is identidad_contexto
    actual = getcontext()
    for atributo in ('prec', 'rounding', 'Emin', 'Emax', 'capitals', 'clamp', 'traps', 'flags'):
        assert getattr(actual, atributo) == getattr(contexto, atributo)
    equivalente.datos['lista'].append(3)
    assert firmar_comando(salida) == firma


@pytest.mark.parametrize('campo,valor', [
    ('operacion_uuid', PADRE), ('accion', 'editar'), ('modo_captura', 'offline'),
    ('referencia_corte', ReferenciaUuidCreacion(uuid=PADRE)),
    ('referencia_corte', ReferenciaIdServidor(id=42)),
    ('depende_de_operacion_uuid', None), ('depende_de_operacion_uuid', PADRE),
    ('momento_real', None), ('momento_real', INSTANTE),
    ('instante_cambio', INSTANTE + timedelta(microseconds=1)),
])
def test_firma_cambios_comunes(entrada: ComandoCorte, campo: str, valor: object) -> None:
    original = canonizar_comando(entrada, 7)
    cambiado = canonizar_comando(replace(entrada, **{campo: valor}), 7)
    assert cambiado != original
    assert firmar_comando(cambiado) != firmar_comando(original)


@pytest.mark.parametrize('campo,valor', [
    ('concepto', 'comision'), ('tipo', 'devolucion'), ('importe', Decimal('2.00')),
    ('metodo', 'tarjeta'), ('bases', {'finanzas': 2}), ('motivo', 'otro'),
    ('evidencia', {'documento': 'otro'}), ('referencia_original', PADRE),
    ('origen_temporal', 'manual'), ('momento', INSTANTE + timedelta(microseconds=1)),
    ('lista', [2, 1]), ('omitido', None),
])
def test_firma_identidad_de_datos_originales(entrada: ComandoCorte, campo: str,
                                           valor: object) -> None:
    datos = {'concepto': 'cliente', 'tipo': 'abono', 'importe': Decimal('1.00'),
             'metodo': 'efectivo', 'bases': {'finanzas': 1}, 'motivo': 'original',
             'evidencia': {'documento': 'original'}, 'referencia_original': CORTE,
             'origen_temporal': 'automatico', 'momento': INSTANTE, 'lista': [1, 2]}
    original = canonizar_comando(replace(entrada, datos=datos), 7)
    cambiado = canonizar_comando(replace(entrada, datos={**datos, campo: valor}), 7)
    assert cambiado != original
    assert firmar_comando(cambiado) != firmar_comando(original)


def test_firma_actor_refs_padre_y_momento_no_intercambiables(entrada: ComandoCorte) -> None:
    base = replace(entrada, depende_de_operacion_uuid=PADRE, momento_real=INSTANTE,
                   referencia_corte=ReferenciaIdServidor(id=42))
    original = canonizar_comando(base, 7)
    variantes = [canonizar_comando(base, 8),
        canonizar_comando(replace(base, referencia_corte=ReferenciaIdServidor(id=43)), 7),
        canonizar_comando(replace(base, depende_de_operacion_uuid=CORTE), 7),
        canonizar_comando(replace(base, momento_real=INSTANTE + timedelta(microseconds=1)), 7)]
    for variante in variantes:
        assert variante != original
        assert firmar_comando(variante) != firmar_comando(original)


@pytest.mark.parametrize('hint', [AUSENTE, None, 1, 42, 999])
def test_firma_hint_sin_autoridad(entrada: ComandoCorte, hint: object) -> None:
    original = canonizar_comando(entrada, 7)
    cambiado = canonizar_comando(replace(entrada, id_servidor_hint=hint), 7)
    assert cambiado == original
    assert firmar_comando(cambiado) == firmar_comando(original)


class CanonicoDerivado(ComandoCanonico):
    pass


class TextoDerivado(str):
    pass


@pytest.mark.parametrize('salida', [None, {}, 'secreto', object(),
    CanonicoDerivado(json_canonico='secreto')])
def test_firma_tipo_salida_estricto(salida: object) -> None:
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        firmar_comando(salida)


@pytest.mark.parametrize('texto', [None, 7, True, b'secreto', TextoDerivado('secreto')])
def test_firma_tipo_texto_estricto(texto: object) -> None:
    with pytest.raises(TypeError, match='^Tipo de comando no admitido$'):
        firmar_comando(ComandoCanonico(json_canonico=texto))


@pytest.mark.parametrize('texto', ['', 'no es JSON ñ', '{ "z":1,"a":2 }', '\n'])
def test_firma_no_recanoniza_ni_certifica_texto_fabricado(texto: str) -> None:
    assert firmar_comando(ComandoCanonico(json_canonico=texto)) == sha256(texto.encode('utf-8')).hexdigest()


def test_firma_error_utf8_seguro() -> None:
    with pytest.raises(ValueError, match='^Entrada de comando inválida$') as captura:
        firmar_comando(ComandoCanonico(json_canonico='confidencial\ud800'))
    assert captura.value.__cause__ is None
    assert captura.value.__suppress_context__
