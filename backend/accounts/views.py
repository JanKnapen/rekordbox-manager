from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
import json
from django.middleware.csrf import get_token

class LoginView(View):
    @csrf_exempt
    def post(self, request):
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'message': 'Login successful'}, status=200)
        else:
            return JsonResponse({'message': 'Invalid credentials'}, status=401)

@ensure_csrf_cookie
def csrf(request):
    # ensure_csrf_cookie will set the csrftoken cookie; return token optionally
    return JsonResponse({'detail': 'CSRF cookie set', 'csrfToken': get_token(request)})